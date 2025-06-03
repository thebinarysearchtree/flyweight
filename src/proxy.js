import {
  insert,
  insertMany,
  update,
  upsert,
  exists,
  group,
  aggregate,
  custom,
  all,
  remove
} from './queries.js';

const groupMethods = (database, table, tx, by, config) => {
  const makeMethod = (method) => {
    return async (query) => await group({ db: database, table, by, method, query, tx, ...config });
  }
  const result = {};
  const methods = ['count', 'avg', 'min', 'max', 'sum'];
  methods.forEach(m => {
    result[m] = makeMethod(m)
  });
  return result;
}

const basic = {
  insert: (database, table, tx) => async (params) => await insert(database, table, params, tx),
  insertMany: (database, table, tx) => async (items) => await insertMany(database, table, items, tx),
  update: (database, table, tx) => async (options) => await update(database, table, options, tx),
  upsert: (database, table, tx) => async (options) => await upsert(database, table, options, tx),
  exists: (database, table, tx) => async (query, config) => await exists({ db: database, table, query, tx, ...config }),
  groupBy: (database, table, tx) => (by, config) => groupMethods(database, table, tx, by, config),
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
  return {
    get: function(target, method) {
      if (method === 'define') {
        return (args) => db.define(table, args);
      }
      if (!target[method]) {
        if (basic[method]) {
          const makeQuery = basic[method];
          const run = makeQuery(db, table, tx, dbClient);
          if (method === 'groupBy') {
            target[method] = (...args) => {
              return run(...args);
            }
          }
          else {
            target[method] = async (...args) => {
              return await run(...args);
            }
          }
          return target[method];
        }
        const makeQuery = (database, table, tx, dbClient) => async (query, config) => await custom({ db: database, table, method, query, tx, dbClient, ...config });
        const run = makeQuery(db, table, tx, dbClient);
        return async (...args) => {
          return await run(...args);
        }
      }
      return target[method];
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
