import Database from '../db.js';

const dbPath = '/Users/andrew/Projects/databases';
const testPath = '/Users/andrew/Projects/flyweight/src/test';

const database = new Database();

const result = await database.initialize({
  db: `${dbPath}/test.db`,
  sql: `${testPath}/sql`,
  tables: `${testPath}/sql/initial.sql`,
  views: `${testPath}/sql/views.sql`,
  types: `${testPath}/db.d.ts`,
  migrations: `${testPath}/migrations`,
  extensions: `${dbPath}/regexp.dylib`
});

const db = result.db;
const makeTypes = result.makeTypes;
const getTables = result.getTables;
const createMigration = result.createMigration;

export {
  database,
  db,
  makeTypes,
  getTables,
  createMigration
}
