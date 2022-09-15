import Database from '../db.js';

const db = new Database('/Users/andrew/Projects/databases/splatter.db');

await db.enforceForeignKeys();
await db.setTables('/Users/andrew/Projects/flyweight/src/test/sql/initial.sql');

db.registerMappers('events', [{
  query: 'getById',
  prefixes: ['blue', 'red'],
  result: 'object'
}]);

export default db;