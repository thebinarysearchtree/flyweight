import { Database } from '../index.js';

const database = new Database();

database.registerTypes([
  {
    name: 'medal',
    makeConstraint: (column) => `check (${column} in ('gold', 'silver', 'bronze'))`,
    tsType: 'string',
    dbType: 'text'
  }
]);

const db = await database.initialize();

export {
  database,
  db
}
