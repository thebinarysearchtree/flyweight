import Database from '../db.js';

const db = new Database('/Users/andrew/Projects/databases/splatter.db');

await db.enforceForeignKeys();
await db.setTables();

db.registerMappers('events', [{
  query: 'getById',
  prefixes: ['blue', 'red'],
  result: 'object'
}]);

db.registerTypes([
  {
    name: 'boolean',
    valueTest: (v) => typeof v === 'boolean',
    makeConstraint: (column) => `check (${column} in (0, 1))`,
    dbToJs: (v) => Boolean(v),
    jsToDb: (v) => v === true ? 1 : 0,
    tsType: 'boolean',
    dbType: 'integer'
  },
  {
    name: 'date',
    valueTest: (v) => v instanceof Date,
    dbToJs: (v) => new Date(v),
    jsToDb: (v) => v.getTime(),
    tsType: 'Date',
    dbType: 'integer'
  },
  {
    name: 'json',
    valueTest: (v) => Object.getPrototypeOf(v) === Object.prototype || Array.isArray(v),
    dbToJs: (v) => JSON.parse(v),
    jsToDb: (v) => JSON.stringify(v),
    tsType: 'any',
    dbType: 'text'
  },
  {
    name: 'regexp',
    valueTest: (v) => v instanceof RegExp,
    dbToJs: (v) => new RegExp(v),
    jsToDb: (v) => v.source,
    tsType: 'RegExp',
    dbType: 'text'
  }
]);

db.registerParsers([
  {
    dbPattern: /^is[A-Z].+$/,
    dbToJs: (v) => Boolean(v)
  },
  {
    dbPattern: /Json$/,
    dbToJs: (v) => JSON.parse(v),
    trim: 'Json'
  },
  {
    pattern: /((At)|(Time))$/,
    dbToJs: (v) => new Date(v),
    jsToDb: (v) => v.getTime()
  }
]);

export default db;