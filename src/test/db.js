import Database from '../db.js';

const path = (subPath) => {
  const url = new URL(subPath, import.meta.url);
  return url.pathname;
}

const database = new Database();

database.registerTypes([
  {
    name: 'medal',
    makeConstraint: (column) => `check (${column} in ('gold', 'silver', 'bronze'))`,
    tsType: 'string',
    dbType: 'text'
  }
]);

const result = await database.initialize({
  db: path('databases/test.db'),
  sql: path('sql'),
  tables: path('sql/tables.sql'),
  views: path('sql/views.sql'),
  types: path('db.d.ts'),
  migrations: path('migrations')
});

const {
  db,
  makeTypes,
  getTables,
  createMigration,
  runMigration
} = result;


export {
  database,
  db,
  makeTypes,
  getTables,
  createMigration,
  runMigration
}
