import Database from '../index.js';

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
  views: path('views'),
  types: path('db.d.ts'),
  migrations: path('migrations'),
  extensions: path('extensions/pcre2.dylib'),
  interfaces: path('interfaces.d.ts')
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
