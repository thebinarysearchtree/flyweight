import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';

let config;

const getExtensions = async (config) => {
  const filenames = await readdir(config.extensions);
  const extension = process.platform === 'darwin' ? 'dylib' : 'so';
  return filenames
    .filter(n => n.endsWith(extension))
    .map(n => join(config.extensions, n));
}

const readSql = async (path) => {
  let sql = '';
  if (path.endsWith('.sql')) {
    sql = await readFile(path, 'utf8');
  }
  else {
    const names = await readdir(path);
    for (const name of names) {
      if (name.endsWith('.sql')) {
        sql += await readFile(join(path, name), 'utf8');
        sql += '\n';
      }
    }
  }
  return sql;
}

const getConfig = async () => {
  if (config) {
    return config;
  }
  const current = process.cwd();

  const path = join(current, 'config.json');

  const result = await readFile(path, 'utf8');
  config = JSON.parse(result);

  const root = config.root || (config.tables ? undefined : current);

  if (root) {
    config.sql = join(root, 'sql');
    config.tables = join(root, 'sql', 'tables.sql');
    config.views = join(root, 'views');
    if (config.type === 'ts') {
      config.types = join(root, 'types.ts');
    }
    else {
      config.types = join(root, 'db.d.ts');
    }
    config.migrations = join(root, 'migrations');
    config.interfaces = join(root, 'interfaces.d.ts');
  }

  return config;
}

const tryReadFile = async (path) => {
  try {
    return await readFile(path, 'utf8');
  }
  catch {
    return undefined;
  }
}

const getQueryText = (sqlDir, table, query) => {
  const path = join(sqlDir, table, `${query}.sql`);
  return readFileSync(path, 'utf8');
}

const getInterfaceFile = async (path) => {
  return await readFile(path, 'utf8');
}

const getTablesText = async (path) => {
  return await readSql(path);
}

const getViewsText = async (path) => {
  return await readSql(path);
}

export {
  getExtensions,
  readSql,
  getConfig,
  readFile,
  tryReadFile,
  join,
  readdir,
  readFileSync,
  getQueryText,
  getInterfaceFile,
  getTablesText,
  getViewsText
}
