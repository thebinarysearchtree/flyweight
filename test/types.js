import { makeTypes } from '../src/utils.js';
import { compareTypes } from './utils.js';
import { getConfig } from '../src/file.js';
import Database from '../src/db.js';

const config = await getConfig();
const db = new Database();
await db.initialize();

const run = async () => {
  await makeTypes(db, config);
  compareTypes();
}

export default {
  name: 'types',
  run
};
