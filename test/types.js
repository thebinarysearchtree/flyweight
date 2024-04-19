import { makeTypes, sqlPath } from './db.js';
import { compareTypes } from './utils.js';
import { writeFile, rm } from 'fs/promises';
import { join } from 'path';

const run = async () => {
  const path = join(sqlPath, 'fights', 'error.sql');
  await writeFile(path, 'select id rom something');
  let error = false;
  try {
    await makeTypes();
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
  await makeTypes();
  compareTypes();
}

export default {
  name: 'types',
  run
};
