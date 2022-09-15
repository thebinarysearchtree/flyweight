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
import { parseQuery, getQueryType } from './sqlParsers/queries.js';

const queries = {
  insert: (database, table) => async (params) => await insert(database, table, params),
  insertMany: (database, table) => async (items) => await insertMany(database, table, items),
  update: (database, table) => async (params, query) => await update(database, table, params, query),
  get: (database, table) => async (query, columns) => await get(database, table, query, columns),
  all: (database, table) => async (query, columns) => await all(database, table, query, columns),
  remove: (database, table) => async (query) => await remove(database, table, query)
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

const makeQueryHandler = (table, db, sqlDir) => ({
  get: function(target, query, receiver) {
    if (!target[query]) {
      if (!sqlDir) {
        if (!queries[query]) {
          throw Error(`Query ${query} of table ${table} not found`);
        }
        else {
          target[query] = queries[query](db, table);
        }
      }
      else {
        const path = join(sqlDir, table, `${query}.sql`);
        try {
          const sql = readFileSync(path, 'utf8');
          const queryType = getQueryType(sql);
          const columns = parseQuery(sql, db.tables);
          const prefixes = getPrefixes(columns);
          const columnMap = {};
          let typeMap = null;
          const primaryKeys = [];
          let i = 0;
          for (const column of columns) {
            columnMap[column.name] = column.originalName;
            const converter = db.getDbToJsConverter(column.type);
            if (converter) {
              if (!typeMap) {
                typeMap = {};
              }
              typeMap[column.name] = converter;
            }
            if (column.primaryKey) {
              primaryKeys.push({
                name: column.name,
                index: i
              });
            }
            i++;
          }
          const statement = db.prepare(sql);
          target[query] = async (params, options) => {
            let mapper;
            if (options) {
              mapper = options;
            }
            else {
              mapper = db.getMapper(table, query);
            }
            mapper.columns = columnMap;
            mapper.types = typeMap;
            mapper.primaryKeys = primaryKeys;
            mapper.prefixes = prefixes;
            let run;
            if (mapper.result === 'none') {
              run = db.run;
            }
            else if (mapper.result === 'value') {
              run = db.get;
            }
            else {
              run = db.all;
            }
            run = run.bind(db);
            return await run(statement, params, mapper);
          }
        }
        catch {
          if (queries[query]) {
            target[query] = queries[query](db, table);
          }
          else {
            throw Error(`Query ${query} of table ${table} not found`);
          }
        }
      }
    }
    return target[query];
  }
});

const makeClient = (db, sqlDir) => {
  const tableHandler = {
    get: function(target, table, receiver) {
      if (!target[table]) {
        target[table] = new Proxy({}, makeQueryHandler(table, db, sqlDir));
      }
      return target[table];
    }
  }
  return new Proxy({}, tableHandler);
}

export {
  makeClient
}
