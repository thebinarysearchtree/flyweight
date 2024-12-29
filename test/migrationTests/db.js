import { SQLiteDatabase } from '../../index.js';
import { join } from 'path';
import sqlite3 from 'sqlite3';
import { readFile, writeFile, readdir } from 'fs/promises';

const readSql = async (path) => {
  let sql = '';
  if (path.endsWith('.sql')) {
    sql = await readFile(path, 'utf8');
  }
  else {
    const names = await readdir(path);
    for (const name of names) {
      if (name.endsWith('.sql')) {
        let text = await readFile(join(path, name), 'utf8');
        text = text.trim();
        if (!text.endsWith(';')) {
          text += ';';
        }
        text += '\n\n';
        sql += text;
      }
    }
  }
  return sql.trim() + '\n';
}

const adaptor = {
  sqlite3,
  readFile,
  writeFile,
  readdir,
  join,
  readSql
};

const path = (subPath) => join(import.meta.dirname, subPath);

const paths = {
  sql: path('sql'),
  tables: path('sql/tables.sql'),
  views: path('views'),
  types: path('db.d.ts'),
  migrations: path('migrations')
};

const database = new SQLiteDatabase({
  db: path('app.db'),
  adaptor,
  ...paths
});

const db = database.getClient();

export {
  database,
  db,
  paths
}
