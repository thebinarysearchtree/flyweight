import {
  insert,
  insertMany,
  update,
  upsert,
  exists,
  aggregate,
  all,
  remove
} from './queries.js';
import { parseQuery, isWrite } from './parsers/queries.js';
import { preprocess, insertUnsafe } from './parsers/preprocessor.js';

const basic = {
  insert: (database, table, tx) => async (params) => await insert(database, table, params, tx),
  insertMany: (database, table, tx) => async (items) => await insertMany(database, table, items, tx),
  update: (database, table, tx) => async (options) => await update(database, table, options, tx),
  upsert: (database, table, tx) => async (options) => await upsert(database, table, options, tx),
  exists: (database, table, tx) => async (query, config) => await exists({ db: database, table, query, tx, ...config }),
  count: (database, table, tx) => async (query, config) => await aggregate({ db: database, table, query, tx, method: 'count', ...config }),
  avg: (database, table, tx) => async (query, config) => await aggregate({ db: database, table, query, tx, method: 'avg', ...config }),
  min: (database, table, tx) => async (query, config) => await aggregate({ db: database, table, query, tx, method: 'min', ...config }),
  max: (database, table, tx) => async (query, config) => await aggregate({ db: database, table, query, tx, method: 'max', ...config }),
  sum: (database, table, tx) => async (query, config) => await aggregate({ db: database, table, query, tx, method: 'sum', ...config }),
  get: (database, table, tx) => async (query, columns, config) => await all({ db: database, table, query, columns, first: true, tx, ...config }),
  many: (database, table, tx) => async (query, columns, config) => await all({ db: database, table, query, columns, tx, ...config }),
  query: (database, table, tx, dbClient) => async (query, config) => await all({ db: database, table, query, tx, dbClient, ...config }),
  first: (database, table, tx, dbClient) => async (query, config) => await all({ db: database, table, query, first: true, tx, dbClient, ...config }),
  remove: (database, table, tx) => async (query) => await remove(database, table, query, tx)
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

const getResultType = (columns) => {
  if (columns.length === 0) {
    return 'none';
  }
  if (columns.length === 1) {
    return 'values';
  }
  else {
    return 'array';
  }
}

const makeQueryHandler = (table, db, tx, dbClient) => {
  let write;
  return {
    get: function(target, query) {
      if (query === 'define') {
        return (args) => db.define(table, args);
      }
      if (!target[query]) {
        if (basic[query]) {
          const makeQuery = basic[query];
          const method = makeQuery(db, table, tx, dbClient);
          target[query] = async (...args) => {
            return await method(...args);
          }
          return target[query];
        }
        let cachedFunction;
        target[query] = async (params, queryOptions, keywords) => {
          if (cachedFunction) {
            return await cachedFunction(params, queryOptions);
          }
          let sql;
          if (!db.initialized) {
            await db.initialize();
          }
          sql = await db.readQuery(table, query);
          sql = preprocess(sql, db.tables);
          write = isWrite(sql);
          const columns = parseQuery(sql, db.tables);
          const options = makeOptions(columns, db);
          options.result = getResultType(columns);
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
                options.result = getResultType(columns);
                db.queryVariations.set(query, { ...options });
                cachedOptions = options;
              }
              const options = {
                query,
                params,
                options: cachedOptions,
                tx,
                write
              };
              if (tx && tx.isBatch) {
                if (options.result === 'none') {
                  return await run(options);
                }
                const result = await run(options);
                return {
                  statement: result.statement,
                  post: (meta) => {
                    return result.post(meta);
                  }
                }
              }
              return await run(options);
            }
            const props = {
              query: sql,
              params,
              options,
              tx,
              write
            };
            if (tx && tx.isBatch) {
              if (options.result === 'none') {
                return await run(props);
              }
              const result = await run(props);
              return {
                statement: result.statement,
                post: (meta) => {
                  return result.post(meta);
                }
              }
            }
            return await run(props);
          };
          return await cachedFunction(params, queryOptions);
        }
      }
      return target[query];
    }
  }
}

const makeClient = (db, tx) => {
  const tableHandler = {
    get: function(target, table, dbClient) {
      if (db[table] && ['exec', 'begin', 'commit', 'rollback', 'pragma', 'deferForeignKeys'].includes(table)) {
        db[table] = db[table].bind(db);
        return (sql) => db[table](tx, sql);
      }
      if (db[table] && ['getTransaction', 'batch', 'sync'].includes(table)) {
        db[table] = db[table].bind(db);
        return db[table];
      }
      if (!target[table]) {
        target[table] = new Proxy({}, makeQueryHandler(table, db, tx, dbClient));
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
