import Database from '../db.js';

const db = new Database('/Users/andrew/Projects/databases/splatter.db');

await db.enforceForeignKeys();
await db.setTables();

export default db;