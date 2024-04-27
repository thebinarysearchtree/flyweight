import { SQLiteDatabase } from '../../index.js';
import { join } from 'path';

const path = (subPath) => join(import.meta.dirname, subPath);

const database = new SQLiteDatabase({
  db: path('app.db'),
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
