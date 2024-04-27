import { database } from './db.js';

await database.createMigration(process.argv[2]);
