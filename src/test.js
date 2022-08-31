import { readFile } from 'fs/promises';
import { parseTables, getTables } from './sqlParsers/tables.js';
import Database from './db.js';

const db = new Database('/Users/andrew/Projects/databases/splatter.db');

const sql = await readFile('/Users/andrew/Projects/splatter/src/database/initial.sql', 'utf8');
const tables = parseTables(sql);
console.log(tables[1].columns);

const result = await db.all('pragma table_info(events)');

console.log(result);

process.exit();
