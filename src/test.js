import { readFile } from 'fs/promises';
import { parseTables, getTables } from './sqlParsers/tables.js';
import Database from './db.js';
import { makeClient } from './proxy.js';

const database = new Database('/Users/andrew/Projects/databases/splatter.db');

//const sql = await readFile('/Users/andrew/Projects/splatter/src/database/initial.sql', 'utf8');

const db = makeClient(database);

const event = await db.events.get({ id: 100 });
console.log(event);

process.exit();
