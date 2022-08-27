import {
  insert,
  insertMany,
  update,
  get,
  all,
  remove
} from './queries.js';

const makeBasicQueries = (database, table) => ({
  insert: async (params) => await insert(database, table, params),
  insertMany: async (items) => await insertMany(database, table, items),
  update: async (params, query) => await update(database, table, params, query),
  get: async (query, columns) => await get(database, table, query, columns),
  all: async (query, columns) => await all(database, table, query, columns),
  remove: async (query) => await remove(database, table, query)
});

const makeClientFromArray = (database, tables) => {
  const db = {};
  for (const table of tables) {
    db[table] = makeBasicQueries(database, table);
  }
  return db;
}

const makeClientFromFolder = (database, sqlFolder) => {
  const db = {};
  const folders = await readdir(sqlFolder);
  for (const folder of folders) {
    const table = folder;
    const queries = {};
    const path = `${sqlFolder}/${folder}`;
    const queryFolders = await readdir(path);
    const setQueries = (type) => {
      const filenames = await readdir(`${path}/${type}`);
      for (const filename of filenames) {
        if (!filename.endsWith('.sql')) {
          continue;
        }
        const sql = await readFile(`${path}/${type}/${filename}`, { encoding: 'utf8' });
        const statement = database.prepare(sql);
        const queryName = filename.split('.')[0];
        const run = database[type];
        queries[queryName] = async (params) => await run(statement, params);
      }
    }
    for (const folder of queryFolders) {
      if (['run', 'get', 'all'].includes(folder)) {
        setQueries(folder);
      }
    }
    const basic = makeBasicQueries(database, table);
    db[table] = { ...basic, ...queries };
  }
  return db;
}

export {
  makeClientFromArray,
  makeClientFromFolder
}
