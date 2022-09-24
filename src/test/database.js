import Database from '../db.js';

const db = new Database('/Users/andrew/Projects/databases/test.db');

await db.enforceForeignKeys();
await db.setTables('/Users/andrew/Projects/flyweight/src/test/sql/initial.sql');
await db.loadExtension('/Users/andrew/Projects/databases/regexp.dylib');

export default db;