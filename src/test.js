import Database from './db.js';
import { parse } from './sqlParsers/queries.js';
import { readFile } from 'fs/promises';

const db = new Database('/Users/andrew/Projects/databases/splatter.db');
await db.setTables('/Users/andrew/Projects/splatter/src/database/initial.sql');

const sql = await readFile('/Users/andrew/Projects/splatter/src/scrapers/test.sql', 'utf8');
console.log(parse(sql, db.tables));
process.exit();
