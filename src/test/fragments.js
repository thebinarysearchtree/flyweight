import { getTables } from './db.js';

const converted = await getTables();
console.log(converted);
process.exit();
