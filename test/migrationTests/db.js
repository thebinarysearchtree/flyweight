import { SQLiteDatabase } from '../../index.js';
import { join } from 'path';
import adaptor from 'flyweight-sqlite';

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
