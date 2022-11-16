import { createTypes } from './sqlParsers/types.js';
import { getFragments } from './sqlParsers/tables.js';
import { blank } from './sqlParsers/utils.js';
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

const addStrict = (sql) => {
  const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)(?<without>\s+without\s+rowid\s*)?(?<ending>;)/gmid);
  let lastIndex = 0;
  const fragments = [];
  for (const match of matches) {
    const [index] = match.indices.groups.ending;
    const fragment = sql.substring(lastIndex, index);
    fragments.push(fragment);
    if (match.groups.without) {
      fragments.push(', strict');
    }
    else {
      fragments.push(' strict');
    }
    lastIndex = index;
  }
  const fragment = sql.substring(lastIndex);
  fragments.push(fragment);
  return fragments.join('');
}

const convertTables = (db, sql) => {
  const fragments = getFragments(sql);
  let converted = '';
  for (const fragment of fragments) {
    if (!fragment.isColumn) {
      converted += fragment.sql;
      continue;
    }
    const customType = db.customTypes[fragment.type];
    if (!customType) {
      converted += fragment.sql;
      continue;
    }
    const match = /^\s*(?<name>[a-z0-9_]+)((\s+not\s+)|(\s+primary\s+)|(\s+references\s+)|(\s+check(\s+|\())|\s*$)/gmi.exec(fragment.sql);
    if (match) {
      fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+)(\s+|$)/gmi, `$1 ${customType.dbType}$2`);
    }
    else {
      fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+\s+)([a-z0-9_]+)((\s+)|$)/gmi, `$1${customType.dbType}$3`);
    }
    if (customType.makeConstraint) {
      const constraint = customType.makeConstraint(fragment.columnName);
      fragment.sql += ' ';
      fragment.sql += constraint;
    }
    converted += fragment.sql;
  }
  return addStrict(converted);
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
  runMigration,
  convertTables
}
