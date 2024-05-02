import { readFile, writeFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { database } from './db.js';
import fileSystem from '../files.js';

const existing = [];
const tablesPath = join('sql', 'tables.sql');

const getPaths = async () => {
  const paths = [];
  const filenames = await readdir('migrations');
  for (const filename of filenames) {
    const path = join('migrations', filename);
    paths.push(path);
  }
  return paths;
}

const saveExisting = async () => {
  const paths = await getPaths();
  for (const path of paths) {
    const data = await readFile(path, 'utf8');
    existing.push({
      data,
      path
    });
  }
}

const runTests = async (printOnly) => {
  const filenames = await readdir('sql');
  const sorted = filenames
    .filter(f => f !== 'tables.sql' && !f.endsWith('e.sql') && !f.endsWith('p.sql'))
    .map(f => ({
      name: f,
      index: parseInt(/\d+/.exec(f)[0], 10)
    }))
    .sort((a, b) => a.index - b.index)
    .map(f => f.name);
  const processedNames = filenames
    .filter(f => f.endsWith('e.sql'))
    .map(f => f.substring(0, f.length - 5));
  const processed = new Set(processedNames);
  let i = 1;
  for (const filename of sorted) {
    const name = filename.split('.')[0];
    const path = join('sql', filename);
    const data = await readFile(path, 'utf8');
    if (!filename.startsWith('tables')) {
      const viewName = filename.replaceAll(/\d/g, '');
      const path = join('views', viewName);
      await writeFile(path, data);
    }
    else {
      await writeFile(tablesPath, data);
    }
    const migration = await database.createMigration(fileSystem, `m${i}`);
    if (printOnly) {
      if (!processed.has(name)) {
        const path = join('sql', `${name}p.sql`);
        await writeFile(path, migration.sql);
      }
      continue;
    }
    const expectedPath = join('sql', `${name}e.sql`);
    const expected = await readFile(expectedPath, 'utf8');
    if (migration.sql !== expected) {
      throw Error(`${filename} resulted in: ${migration.sql}`);
    }
  }
}

const cleanUp = async () => {
  const paths = await getPaths();
  for (const path of paths) {
    await rm(path);
  }
  const filenames = await readdir('views');
  for (const filename of filenames) {
    const path = join('views', filename);
    await rm(path);
  }
  for (const file of existing) {
    await writeFile(file.path, file.data);
  }
}

try {
  await saveExisting();
  await runTests(true);
  console.log('All tests passed');
}
finally {
  await cleanUp();
}
