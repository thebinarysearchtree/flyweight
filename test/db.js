import { SQLiteDatabase } from '../index.js';

const path = (subPath) => {
  const url = new URL(subPath, import.meta.url);
  return url.pathname;
}

const database = new SQLiteDatabase({
  db: path('databases/test.db'),
  sql: path('sql'),
  tables: path('sql/tables.sql'),
  views: path('views'),
  types: path('db.d.ts'),
  migrations: path('migrations')
});

const db = database.getClient();

export {
  database,
  db
}
