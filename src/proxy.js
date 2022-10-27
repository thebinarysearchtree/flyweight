import { readFileSync } from 'fs';
import {
  insert,
  insertMany,
  update,
  get,
  all,
  remove
} from './queries.js';
import { join } from 'path';
import { parseQuery, isWrite } from './sqlParsers/queries.js';
import pluralize from 'pluralize';

const queries = {
  insert: (database, table, tx) => async (params) => await insert(database, table, params, tx),
  insertMany: (database, table, tx) => async (items) => await insertMany(database, table, items, tx),
  update: (database, table, tx) => async (params, query) => await update(database, table, params, query, tx),
  get: (database, table, tx) => async (query, columns) => await get(database, table, query, columns, tx),
  all: (database, table, tx) => async (query, columns) => await all(database, table, query, columns, tx),
  remove: (database, table, tx) => async (query) => await remove(database, table, query, tx)
}

const singularQueries = {
  insert: queries.insert,
  update: queries.update,
  get: queries.get,
  remove: queries.remove
}

const multipleQueries = {
  insert: queries.insertMany,
  update: queries.update,
  get: queries.all,
  remove: queries.remove
}

const getPrefixes = (columns) => {
  let prefixes = null;
  let prefix;
  let foreign;
  let keys = [];
  for (const column of columns) {
    if (column.foreign) {
      if (prefix) {
        if (!prefixes) {
          prefixes = {};
        }
        prefixes[prefix] = [...keys];
        keys = [];
        prefix = undefined;
        foreign = undefined;
      }
      prefix = column.name.split(/[A-Z]/)[0];
      keys.push(column.name);
      foreign = column.foreign;
      continue;
    }
    if (prefix) {
      if (column.name.split(/[A-Z]/)[0] === prefix && column.tableName === foreign) {
        keys.push(column.name);
      }
      else {
        if (!prefixes) {
          prefixes = {};
        }
        prefixes[prefix] = [...keys];
        keys = [];
        prefix = undefined;
        foreign = undefined;
      }
    }
  }
  if (prefix) {
    if (!prefixes) {
      prefixes = {};
    }
    prefixes[prefix] = [...keys];
  }
  if (!prefixes) {
    return null;
  }
  const result = {};
  for (const [key, value] of Object.entries(prefixes)) {
    if (value.length > 1) {
      result[key] = value;
    }
  }
  if (Object.keys(result).length === 0) {
    return null;
  }
  return result;
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
  const prefixes = getPrefixes(columns);
  const columnMap = {};
  let typeMap = null;
  const primaryKeys = [];
  let i = 0;
  let revertMap = {};
  const primaryKeyCount = new Set(columns.filter(c => c.primaryKey).map(c => c.tableName)).size;
  let lastPrimaryKey;
  for (const column of columns) {
    const rename = column.rename && primaryKeyCount > 1 && column.originalName.length < column.name.length;
    const columnName = rename ? column.originalName : column.name;
    columnMap[column.name] = rename ? column.originalName : column.name;
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
              if (structuredType === 'text') {
                converted.sort((a, b) => a.localeCompare(b));
              }
              if (structuredType === 'integer' || structuredType === 'real') {
                converted.sort((a, b) => a - b);
              }
              if (structuredConverter && !(structured.functionName && /^json_/i.test(structured.functionName))) {
                converted = converted.map(i => structuredConverter(i));
                if (structuredType === 'date') {
                  converted.sort((a, b) => b.getTime() - a.getTime());
                }
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
    if (column.primaryKey) {
      if (lastPrimaryKey) {
        if (lastPrimaryKey.index === i - 1 && lastPrimaryKey.tableName === column.tableName) {
          lastPrimaryKey.index = i;
          i++;
          continue;
        }
      }
      lastPrimaryKey = {
        tableName: column.tableName,
        index: i
      };
      primaryKeys.push({
        name: column.name,
        index: i
      });
      revertMap = {};
      revertMap[columnName] = column.name;
    }
    else {
      const revert = revertMap[columnName];
      if (revert) {
        columnMap[revert] = revert;
        columnMap[column.name] = column.name;
      }
      else {
        revertMap[columnName] = column.name;
      }
    }
    i++;
  }
  const options = {
    parse: true,
    map: true
  }
  options.columns = columnMap;
  options.types = typeMap;
  options.primaryKeys = primaryKeys;
  options.prefixes = prefixes;
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
          const path = join(sqlDir, table, `${query}.sql`);
          let sql;
          try {
            sql = readFileSync(path, 'utf8');
          }
          catch (e) {
            const makeQuery = isSingular ? singularQueries[query] : multipleQueries[query];
            if (makeQuery) {
              target[query] = makeQuery(db, table, tx);
              return target[query];
            }
            else {
              throw e;
            }
          }
          const write = isWrite(sql);
          try {
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
            options.cacheName = `${table}.${query}`;
            target[query] = async (params) => {
              return await run(sql, params, options, tx, write);
            }
          }
          catch {
            target[query] = async (params) => {
              return await db.all(sql, params, tx, write);
            }
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
        return () => db.pool.push(tx);
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
