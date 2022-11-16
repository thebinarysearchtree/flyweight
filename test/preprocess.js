import { database } from './db.js';
import { preprocess } from '../src/parsers/preprocessor.js';

const sql = `select e.*, c.* from events e join cards c on c.eventId = e.id`;

console.log(preprocess(sql, database.tables));