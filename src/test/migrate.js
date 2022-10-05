import { migrate } from '../migrations.js';
import { database } from './db.js';

await migrate(database, '/Users/andrew/Projects/flyweight/src/test/sql/initial.sql', '/Users/andrew/Projects/flyweight/src/test/migrations', 'test');
process.exit();
