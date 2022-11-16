import { createTypes } from './parsers/types.js';
import { migrate } from './migrations.js';

const makeTypes = async (db, config, watch) => {
  const run = async () => {
    await createTypes({
      db,
      config
    });
  }
  if (watch) {
    const watchRun = async (path) => {
      try {
        await run();
      }
      catch {
        if (path) {
          console.log(`Error trying to parse ${path}`);
        }
      }
    }
    await watchRun();
    const paths = [config.sql, config.tables, config.views];
    watch(paths)
      .on('add', watchRun)
      .on('change', watchRun);
  }
  else {
    await run();
  }
}

const getTables = async (db, config) => {
  const sql = await readFile(config.tables, 'utf8');
  return convertTables(db, sql);
}

const createMigration = async (db, config, name) => {
  await migrate(db, config, name);
}

const runMigration = async (db, config, name) => {
  const path = join(config.migrations, `${name}.sql`);
  const sql = await readFile(path, 'utf8');
  db.disableForeignKeys();
  try {
    await db.begin();
    await db.exec(sql);
    await db.commit();
    console.log('Migration ran successfully.');
  }
  catch (e) {
    console.log(e);
    await db.rollback();
  }
  db.enableForeignKeys();
}

export {
  makeTypes,
  getTables,
  createMigration,
  runMigration
}
