import { createMigration } from '../src/utils.js';
import { getConfig } from '../src/file.js';
import Database from '../src/db.js';

const config = await getConfig();
const db = new Database();
await db.initialize();

await createMigration(db, config, process.argv[2]);
