import { database } from './db.js';
import fileSystem from './files.js';

await database.createMigration(fileSystem, process.argv[2]);
