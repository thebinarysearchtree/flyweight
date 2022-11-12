import { db } from './db.js';

const test = await db.method.test();
console.log(test);