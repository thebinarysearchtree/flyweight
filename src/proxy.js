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
        const path = join(sqlDir, table, `${query}.sql`);
        try {
          const sql = readFileSync(path, 'utf8');
          const statement = db.prepare(sql);
          target[query] = async (params, options) => {
            let mapper;
            if (options) {
              mapper = options;
            }
            else {
              mapper = db.getMapper(table, query);
            }
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
