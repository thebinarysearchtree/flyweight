import database from './database.js';
import { createTypes } from '../sqlParsers/types.js';

const options = {
  db: database,
  sqlDir: '/Users/andrew/Projects/flyweight/src/test/sql',
  createTablePath: '/Users/andrew/Projects/flyweight/src/test/sql/initial.sql',
  destinationPath: '/Users/andrew/Projects/flyweight/src/test/db.d.ts'
}

await createTypes(options);
process.exit();
