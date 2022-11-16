import { getConfig } from './file.js';
import Database from './db.js';
import { makeTypes, getTables, createMigration, runMigration } from './utils.js';

const config = await getConfig();
const db = new Database();
await db.initialize();

if (process.argv[2] === 'migrate' && process.argv[3] === 'create') {
  await createMigration(db, config, process.argv[4]);
}

if (process.argv[2] === 'migrate' && process.argv[3] === 'run') {
  await runMigration(db, config, process.argv[4]);
}
