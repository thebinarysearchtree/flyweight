import { createMigration } from './db.js';

await createMigration(process.argv[2]);
