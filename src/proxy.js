import { readFile } from 'fs/promises';
import {
  insert,
  insertMany,
  update,
  get,
  all,
  remove
} from './queries.js';

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
        target[query] = queries[query](db, table);
      }
      else {
        for (const type of ['all', 'get', 'run']) {
          const path = `${sqlDir}/${table}/${type}/${query}.sql`;
          try {
            const sql = await readFile(path, 'utf8');
            const statement = db.prepare(sql);
            const run = db[type];
            break;
          }
          catch {
            continue;
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
