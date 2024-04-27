import { database } from './db.js';

const converted = await database.getTables();
console.log(converted);
process.exit();
