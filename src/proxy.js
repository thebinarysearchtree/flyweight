import { readFile, join } from './files.js';
import {
  insert,
  insertMany,
  update,
  exists,
  count,
  get,
  all,
  remove
} from './queries.js';
import { parseQuery, isWrite } from './parsers/queries.js';
import pluralize from 'pluralize';
import { preprocess, insertUnsafe } from './parsers/preprocessor.js';

const queries = {
  insert: (database, table, tx) => async (params) => await insert(database, table, params, tx),
  insertMany: (database, table, tx) => async (items) => await insertMany(database, table, items, tx),
  update: (database, table, tx) => async (params, query) => await update(database, table, params, query, tx),
  exists: (database, table, tx) => async (query) => await exists(database, table, query, tx),
  count: (database, table, tx) => async (query, keywords) => await count(database, table, query, keywords, tx),
  get: (database, table, tx) => async (query, columns) => await get(database, table, query, columns, tx),
  all: (database, table, tx) => async (query, columns) => await all(database, table, query, columns, tx),
  remove: (database, table, tx) => async (query) => await remove(database, table, query, tx)
}

const singularQueries = {
  insert: queries.insert,
  update: queries.update,
  exists: queries.exists,
  get: queries.get,
  remove: queries.remove
}

const multipleQueries = {
  insert: queries.insertMany,
  update: queries.update,
  count: queries.count,
  get: queries.all,
  remove: queries.remove
}

const convertItem = (item, converters) => {
  for (const converter of converters) {
    const keys = converter.keys;
    const count = keys.length;
    let i = 0;
    let actual = item;
    for (const key of keys) {
      if (i + 1 === count) {
        if (actual[key] !== null) {
          actual[key] = converter.converter(actual[key]);
        }
      }
      actual = actual[key];
      i++;
    }
  }
}

const getConverters = (key, value, db, converters, keys = [], optional = []) => {
  keys.push(key);
  if (typeof value.type === 'string') {
    optional.push(value.isOptional);
    if (value.functionName && /^json_/i.test(value.functionName)) {
      return;
    }
    const converter = db.getDbToJsConverter(value.type);
    if (converter) {
      converters.push({
        keys: [...keys],
        converter
      });
    }
    return;
  }
  else {
    for (const [k, v] of Object.entries(value.type)) {
      getConverters(k, v, db, converters, [...keys], optional);
    }
  }
}

const allNulls = (item) => {
  if (item === null) {
    return true;
  }
  for (const value of Object.values(item)) {
    if (value === null) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) {
      return false;
    }
    const isNull = allNulls(value);
    if (!isNull) {
      return false;
    }
  }
  return true;
}

const makeOptions = (columns, db) => {
  const columnMap = {};
  let typeMap = null;
  for (const column of columns) {
    columnMap[column.name] = column.name.replace(/^flyweight\d+_/, '');
    const converter = db.getDbToJsConverter(column.type);
    let actualConverter = converter;
    if (converter) {
      if (!typeMap) {
        typeMap = {};
      }
      const structured = column.structuredType;
      if (structured) {
        if (column.functionName === 'json_group_array') {
          const structuredType = structured.type;
          if (typeof structuredType === 'string') {
            const structuredConverter = db.getDbToJsConverter(structuredType);
            actualConverter = (v) => {
              let converted = converter(v);
              converted = converted.filter(v => v !== null);
              if (structuredConverter && !(structured.functionName && /^json_/i.test(structured.functionName))) {
                converted = converted.map(i => structuredConverter(i));
              }
              return converted;
            }
          }
          else {
            const converters = [];
            const optional = [];
            for (const [key, value] of Object.entries(structuredType)) {
              getConverters(key, value, db, converters, [], optional);
            }
            const isOptional = !optional.some(o => o === false);
            if (converters.length > 0) {
              actualConverter = (v) => {
                const converted = converter(v);
                for (const item of converted) {
                  convertItem(item, converters);
                }
                if (isOptional) {
                  return converted.filter(c => !allNulls(c));
                }
                return converted;
              }
            }
            else if (isOptional) {
              actualConverter = (v) => {
                const converted = converter(v);
                return converted.filter(c => !allNulls(c));
              }
            }
          }
        }
        else if (column.functionName === 'json_object') {
          const structuredType = structured.type;
          const converters = [];
          const optional = [];
          for (const [key, value] of Object.entries(structuredType)) {
            getConverters(key, value, db, converters, [], optional);
          }
          const isOptional = !optional.some(o => o === false);
          if (converters.length > 0) {
            actualConverter = (v) => {
              const converted = converter(v);
              convertItem(converted, converters);
              if (allNulls(converted)) {
                return null;
              }
              return converted;
            }
          }
          else if (isOptional) {
            actualConverter = (v) => {
              const converted = converter(v);
              if (allNulls(converted)) {
                return null;
              }
              return converted;
            }
          }
        }
        else if (column.functionName === 'json_array') {
          const converters = [];
          let i = 0;
          for (const type of structured) {
            getConverters(i, type, db, converters);
            i++;
          }
          if (converters.length > 0) {
            actualConverter = (v) => {
              const converted = converter(v);
              convertItem(converted, converters);
              return converted;
            }
          }
        }
      }
      typeMap[column.name] = actualConverter;
    }
  }
  const options = {
    parse: true,
    map: true
  }
  options.columns = columnMap;
  options.types = typeMap;
  return options;
}

const getResultType = (columns, isSingular) => {
  if (columns.length === 0) {
    return 'none';
  }
  else if (isSingular) {
    if (columns.length === 1) {
      return 'value';
    }
    else {
      return 'object';
    }
  }
  else {
    if (columns.length === 1) {
      return 'values';
    }
    else {
      return 'array';
    }
  }
}

const makeQueryHandler = (table, db, sqlDir, tx) => {
  let isSingular;
  let queries;
  if (pluralize.isSingular(table)) {
    isSingular = true;
    table = pluralize.plural(table);
    queries = singularQueries;
  }
  else {
    isSingular = false;
    queries = multipleQueries;
  }
  let write;
  return {
    get: function(target, query, receiver) {
      if (!target[query]) {
        if (!sqlDir) {
          if (!queries[query]) {
            throw Error(`Query ${query} of table ${table} not found`);
          }
          else {
            target[query] = queries[query](db, table, tx);
          }
        }
        else {
          let cachedFunction;
          target[query] = async (params, queryOptions) => {
            if (cachedFunction) {
              return await cachedFunction(params, queryOptions);
            }
            const path = join(sqlDir, table, `${query}.sql`);
            let sql;
            try {
              sql = await readFile(path, 'utf8');
              sql = preprocess(sql, db.tables);
            }
            catch (e) {
              const makeQuery = isSingular ? singularQueries[query] : multipleQueries[query];
              if (makeQuery) {
                cachedFunction = makeQuery(db, table, tx);
                return await cachedFunction(params, queryOptions);
              }
              else {
                throw e;
              }
            }
            write = isWrite(sql);
            const columns = parseQuery(sql, db.tables);
            const options = makeOptions(columns, db);
            options.result = getResultType(columns, isSingular);
            let run;
            if (options.result === 'none') {
              run = db.run;
            }
            else {
              run = db.all;
            }
            run = run.bind(db);
            cachedFunction = async (params, queryOptions) => {
              if (queryOptions && queryOptions.unsafe) {
                const query = insertUnsafe(sql, queryOptions.unsafe);
                let cachedOptions = db.queryVariations.get(query);
                if (!cachedOptions) {
                  const columns = parseQuery(query, db.tables);
                  const options = makeOptions(columns, db);
                  options.result = getResultType(columns, isSingular);
                  db.queryVariations.set(query, { ...options });
                  cachedOptions = options;
                }
                return await run({
                  query,
                  params,
                  options: cachedOptions,
                  tx,
                  write
                });
              }
              return await run({
                query: sql,
                params,
                options,
                tx,
                write
              });
            };
            return await cachedFunction(params, queryOptions);
          }
        }
      }
      return target[query];
    }
  }
}

const makeClient = (db, sqlDir, tx) => {
  const tableHandler = {
    get: function(target, table, receiver) {
      if (['begin', 'commit', 'rollback'].includes(table)) {
        db[table] = db[table].bind(db);
        return () => db[table](tx);
      }
      if (table === 'getTransaction') {
        db[table] = db[table].bind(db);
        return db[table];
      }
      if (table === 'release') {
        return (tx) => db.pool.push(tx);
      }
      if (!target[table]) {
        target[table] = new Proxy({}, makeQueryHandler(table, db, sqlDir, tx));
      }
      return target[table];
    }
  }
  return new Proxy({}, tableHandler);
}

export {
  makeClient,
  makeOptions,
  getResultType
}
