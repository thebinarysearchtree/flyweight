import { database, paths } from './db.js';
import fileSystem from './files.js';

await database.createMigration(fileSystem, paths, process.argv[2]);
