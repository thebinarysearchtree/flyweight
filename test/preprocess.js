import { preprocess } from '../src/sqlParsers/preprocessor.js';

const sql = `select
id,
groupArray(object(name, startTime, array(2, 3) as arr)) as nest
from events limit 5;`;

console.log(preprocess(sql));