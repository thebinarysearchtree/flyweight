import { readFile } from 'fs/promises';
import db from './database.js';

const sql = await readFile('/Users/andrew/Projects/flyweight/src/test/sql/initial.sql', 'utf8');
const converted = db.convertTables(sql);
console.log(converted);
process.exit();
