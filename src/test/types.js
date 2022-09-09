import db from './db.js';
import { createTypes } from '../sqlParsers/types.js';

db.registerMappers('events', [{
  query: 'getById',
  prefixes: ['blue', 'red']
}]);

const options = {
  db,
  sqlDir: '/Users/andrew/Projects/flyweight/src/test/sql',
  interfaceName: 'TypedDb',
  destinationPath: '/Users/andrew/Projects/flyweight/src/test/db.d.ts'
}

await createTypes(options);
process.exit();
