import { SQLiteDatabase } from '../index.js';
import adaptor from 'flyweight-sqlite';

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
  migrations: path('migrations'),
  adaptor
});

const db = database.getClient();

export {
  database,
  db
}
