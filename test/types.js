import { database } from './db.js';
import { compareTypes } from './utils.js';
import { writeFile, rm } from 'fs/promises';
import { join } from 'path';

const run = async () => {
  await database.makeTypes();
  compareTypes();
  const path = join(database.sqlPath, 'fights', 'error.sql');
  await writeFile(path, 'select id rom something');
  let error = false;
  try {
    await database.makeTypes();
  }
  catch (e) {
    error = e.message.includes('SQLITE_ERROR: near "something": syntax error');
  }
  finally {
    await rm(path);
  }
  if (!error) {
    throw Error('No error message');
  }
}

export default {
  name: 'types',
  run
};
