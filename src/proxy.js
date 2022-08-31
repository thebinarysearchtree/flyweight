import { readFileSync } from 'fs';
import {
  insert,
  insertMany,
  update,
  get,
  all,
  remove
} from './queries.js';
import { registeredMappers } from './utils.js';

const queries = {
  insert: (database, table) => async (params) => await insert(database, table, params),
  insertMany: (database, table) => async (items) => await insertMany(database, table, items),
  update: (database, table) => async (params, query) => await update(database, table, params, query),
  get: (database, table) => async (query, columns) => await get(database, table, query, columns),
  all: (database, table) => async (query, columns) => await all(database, table, query, columns),
  remove: (database, table) => async (query) => await remove(database, table, query)
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
        let found = false;
        for (const type of ['all', 'get', 'run']) {
          const path = `${sqlDir}/${table}/${type}/${query}.sql`;
          try {
            const sql = readFileSync(path, 'utf8');
            const statement = db.prepare(sql);
            const run = db[type];
            target[query] = async (params, options) => await run(statement, params, options || registeredMappers[table][query]);
            found = true;
            break;
          }
          catch {
            continue;
          }
        }
        if (!found) {
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
