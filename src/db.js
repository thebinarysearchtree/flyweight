import sqlite3 from 'sqlite3';
import { toValues, readSql } from './utils.js';
import { parse } from './parsers.js';
import { mapOne, mapMany } from './map.js';
import { getTables, getViews, getVirtual } from './parsers/tables.js';
import { readFile } from 'fs/promises';
import { getFragments } from './parsers/tables.js';
import { blank } from './parsers/utils.js';
import { makeClient } from './proxy.js';
import { createTypes } from './parsers/types.js';
import { watch } from 'chokidar';
import { migrate } from './migrations.js';
import { join } from 'path';
import { parseInterfaces } from './parsers/interfaces.js';
import { getConverter } from './json.js';
import { preprocess } from './parsers/preprocessor.js';

const process = (db, result, options) => {
  if (!options) {
    return result;
  }
  if (result.length === 0) {
    if (options.result === 'object' || options.result === 'value') {
      return undefined;
    }
    return result;
  }
  let mapper;
  if (options.result === 'object' || options.result === 'value') {
    mapper = mapOne;
  }
  else {
    mapper = mapMany;
  }
  if (options.result === 'value' || options.result === 'values') {
    if (options.parse) {
      const parsed = parse(result, options.types);
      const values = toValues(parsed);
      if (options.result === 'value') {
        return values[0];
      }
      return values;
    }
    const values = toValues(result);
    if (options.result === 'value') {
      return values[0];
    }
    return values;
  }
  if (options.parse && !options.map) {
    const parsed = parse(result, options.types);
    if (options.result === 'object') {
      return parsed[0];
    }
    return parsed;
  }
  if (options.map) {
    return mapper(db, result, options.columns, options.types, options.primaryKeys);
  }
  return result;
}

const dbTypes = {
  integer: true,
  int: true,
  real: true,
  text: true,
  blob: true,
  any: true
}

const validateCustomType = (customType) => {
  const error = `Error trying to register type '${customType.name}': `;
  if (!customType.name || !customType.tsType || !customType.dbType) {
    throw Error(error + 'missing required fields.');
  }
  if (!/^[a-z0-9_]+$/gmi.test(customType.name)) {
    throw Error(error + `invalid name.`);
  }
  if (!dbTypes[customType.dbType]) {
    throw Error(error + `${customType.dbType} is not a valid database type.`);
  }
  if (customType.jsToDb && !customType.valueTest) {
    throw Error(error + 'missing valueTest function.');
  }
  if (!customType.jsToDb && customType.valueTest) {
    throw Error(error + 'missing jsToDb function.');
  }
}

const regexpJsToDb = (v) => {
  const flags = v
    .flags
    .split('')
    .filter(f => ['i', 's', 'm'].includes(f))
    .join('');
  let source;
  if (flags !== '') {
    source = `(?${flags})${v.source}`;
  }
  else {
    source = v.source;
  }
  source = source.replaceAll(/(\\p{)Script=/g, '$1');
  return source;
}

const regexpDbToJs = (v) => {
  const match = v.match(/^\(\?(?<flags>[smi]+)\)/);
  let flags = 'u';
  if (match) {
    v = v.replace(/^\(\?[smi]+\)/, '');
    flags += match.groups.flags;
  }
  v = v.replaceAll(/\\p{([^}]{3,})\}/gi, '\\p{Script=$1}');
  return new RegExp(v, flags);
}

const wait = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 100);
  });
}

class Database {
  constructor() {
    this.db;
    this.read = null;
    this.write = null;
    this.tables = {};
    this.columnSets = {};
    this.mappers = {};
    this.customTypes = {};
    this.columns = {};
    this.statements = new Map();
    this.viewSet = new Set();
    this.pool = [];
    this.poolSize = 100;
    this.dbPath = null;
    this.sqlPath = null;
    this.transactionCount = 0;
    this.extensions = null;
    this.databases = [];
    this.virtualSet = new Set();
    this.interfaces = {};
    this.registerTypes([
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
        jsToDb: (v) => v.toISOString(),
        tsType: 'Date',
        dbType: 'text'
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
        dbToJs: regexpDbToJs,
        jsToDb: regexpJsToDb,
        tsType: 'RegExp',
        dbType: 'text'
      }
    ]);
  }

  async initialize(paths, interfaceName) {
    const { db, sql, tables, views, types, migrations, extensions, interfaces } = paths;
    this.dbPath = db;
    this.sqlPath = sql;
    this.extensions = extensions;
    this.read = await this.createDatabase();
    this.write = await this.createDatabase({ serialize: true });
    await this.setTables(tables);
    await this.setVirtual(tables);
    if (views) {
      await this.setViews(views);
    }
    let interfaceFile;
    if (interfaces) {
      interfaceFile = await readFile(interfaces, 'utf8');
      const matches = interfaceFile
        .replaceAll(/\s+/g, ' ')
        .matchAll(/(^| )export (interface|type) (?<name>[a-z0-9_]+) /gmi);
      const json = this.customTypes['json'];
      const customTypes = [];
      for (const match of matches) {
        const name = match.groups.name;
        customTypes.push({
          ...json,
          name: name.toLowerCase(),
          tsType: name
        });
      }
      this.registerTypes(customTypes);
      try {
        const parsed = parseInterfaces(interfaceFile);
        this.interfaces = parsed;
      }
      catch {
        this.interfaces = null;
      }
    }
    const client = makeClient(this, sql);
    const makeTypes = async (options) => {
      const run = async () => {
        await createTypes({
          db: this,
          sqlDir: sql,
          destinationPath: types,
          interfaceName,
          interfaces: interfaceFile
        });
      }
      if (options && options.watch) {
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
        const paths = [sql, tables, views].filter(p => p !== undefined);
        watch(paths)
          .on('add', watchRun)
          .on('change', watchRun);
      }
      else {
        await run();
      }
    }
    const getTables = async () => {
      const sql = await readFile(tables, 'utf8');
      return this.convertTables(sql);
    }
    const createMigration = async (name) => {
      await migrate(this, tables, views, migrations, name);
    }
    const runMigration = async (name) => {
      const path = join(migrations, `${name}.sql`);
      const sql = await readFile(path, 'utf8');
      this.disableForeignKeys();
      try {
        await this.begin();
        await this.exec(sql);
        await this.commit();
        console.log('Migration ran successfully.');
      }
      catch (e) {
        console.log(e);
        await this.rollback();
      }
      this.enableForeignKeys();
    }
    return {
      db: client,
      makeTypes,
      getTables,
      createMigration,
      runMigration
    }
  }

  async createDatabase(options) {
    const serialize = options ? options.serialize : false;
    const db = new sqlite3.Database(this.dbPath);
    if (serialize) {
      db.serialize();
    }
    this.enableForeignKeys(db);
    if (this.extensions) {
      if (typeof this.extensions === 'string') {
        await this.loadExtension(this.extensions, db);
      }
      else {
        for (const extension of this.extensions) {
          await this.loadExtension(extension, db);
        }
      }
    }
    this.databases.push(db);
    return db;
  }

  async enableForeignKeys(db) {
    await this.basicAll('pragma foreign_keys = on', db);
  }

  async disableForeignKeys(db) {
    await this.basicAll('pragma foreign_keys = off', db);
  }

  addTables(tables) {
    for (const table of tables) {
      this.tables[table.name] = table.columns;
      this.columnSets[table.name] = table.columnSet;
      this.columns[table.name] = {};
      for (const column of table.columns) {
        this.columns[table.name][column.name] = column.type;
      }
    }
  }

  async setTables(path) {
    const sql = await readSql(path);
    if (!sql.trim()) {
      return;
    }
    const tables = getTables(sql);
    this.addTables(tables);
  }

  async setViews(path) {
    let sql = await readSql(path);
    if (!sql.trim()) {
      return;
    }
    sql = preprocess(sql, this.tables);
    const views = getViews(sql, this);
    for (const view of views) {
      this.viewSet.add(view.name);
    }
    this.addTables(views);
  }

  async setVirtual(path) {
    const sql = await readSql(path);
    if (!sql.trim()) {
      return;
    }
    const tables = getVirtual(sql);
    this.addTables(tables);
    for (const table of tables) {
      this.virtualSet.add(table.name);
      this.columnSets[table.name].add(table.name);
    }
  }

  registerTypes(customTypes) {
    for (const customType of customTypes) {
      const { name, ...options } = customType;
      validateCustomType(customType);

      this.customTypes[name] = options;
    }
  }

  addStrict(sql) {
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

  convertTables(sql) {
    const fragments = getFragments(sql);
    let converted = '';
    for (const fragment of fragments) {
      if (!fragment.isColumn) {
        converted += fragment.sql;
        continue;
      }
      const customType = this.customTypes[fragment.type];
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
    return this.addStrict(converted);
  }

  convertToDb(value) {
    for (const customType of Object.values(this.customTypes)) {
      if (customType.valueTest(value)) {
        return customType.jsToDb(value);
      }
    }
    return value;
  }

  needsParsing(table, keys) {
    for (const key of keys) {
      if (key === 'count') {
        continue;
      }
      const type = this.columns[table][key];
      if (!dbTypes[type]) {
        return true;
      }
    }
    return false;
  }

  getPrimaryKey(table) {
    const primaryKey = this.tables[table].find(c => c.primaryKey);
    return primaryKey.name;
  }

  convertToJs(table, column, value) {
    if (value === null) {
      return value;
    }
    const type = this.columns[table][column];
    if (dbTypes[type]) {
      return value;
    }
    const customType = this.customTypes[type];
    const definedType = this.interfaces[type];
    if (definedType) {
      const converter = getConverter(definedType, this);
      if (converter) {
        let converted = customType.dbToJs(value);
        converted = converter(converted);
        return converted;
      }
    }
    return customType.dbToJs(value);
  }

  getJsToDbConverter(value) {
    for (const customType of Object.values(this.customTypes)) {
      if (customType.valueTest(value)) {
        return customType.jsToDb;
      }
    }
    return null;
  }

  getDbToJsConverter(type) {
    const customType = this.customTypes[type];
    if (customType) {
      return customType.dbToJs;
    }
    return null;
  }

  adjust(params) {
    const adjusted = {};
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined) {
        value = null;
      }
      if (value === null || typeof value === 'string' || typeof value === 'number' || value instanceof Buffer) {
        adjusted[`$${key}`] = value;
      }
      else {
        for (const customType of Object.values(this.customTypes)) {
          if (customType.valueTest(value)) {
            value = customType.jsToDb(value);
            break;
          }
        }
        adjusted[`$${key}`] = value;
      }
    }
    return adjusted;
  }

  async getTransaction() {
    const db = this.pool.pop();
    if (!db) {
      if (this.databases.length < this.poolSize) {
        const db = await this.createDatabase({ serialize: true });
        const tx = { name: `tx${this.databases.length}`, db };
        const client = makeClient(this, this.sqlPath, tx);
        return client;
      }
      await wait();
      return this.getTransaction();
    }
    return db;
  }

  async begin(tx) {
    await this.basicRun('begin', tx);
  }

  async commit(tx) {
    await this.basicRun('commit', tx);
  }

  async rollback(tx) {
    await this.basicRun('rollback', tx);
  }

  release(tx) {
    this.pool.push(tx);
  }

  async loadExtension(path, db) {
    return new Promise((resolve, reject) => {
      db.loadExtension(path, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  async basicRun(sql, tx) {
    const db = tx ? tx.db : this.write;
    return new Promise((resolve, reject) => {
      db.run(sql, undefined, function (err) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  async basicAll(sql, tx) {
    const db = tx ? tx : this.write;
    return new Promise((resolve, reject) => {
      db.all(sql, undefined, function (err, rows) {
        if (err) {
          reject(err);
        }
        else {
          resolve(rows);
        }
      });
    });
  }

  async prepare(sql, db) {
    return new Promise((resolve, reject) => {
      const statement = db.prepare(sql, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(statement);
        }
      });
    });
  }

  async run(query, params, options, tx) {
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined) {
      params = this.adjust(params);
    }
    const db = tx ? tx.db : this.write;
    if (typeof query === 'string') {
      let key;
      if (options && options.cacheName) {
        key = options.cacheName;
      }
      else {
        key = query;
      }
      const statementKey = tx ? tx.name : 'write';
      const statements = this.statements[statementKey];
      const cached = statements ? this.statements.get(key) : undefined;
      if (cached) {
        query = cached;
      }
      else {
        if (!statements) {
          this.statements[statementKey] = new Map();
        }
        const statement = await this.prepare(query, db);
        this.statements[statementKey].set(key, statement);
        query = statement;
      }
    }
    return new Promise((resolve, reject) => {
      query.run(params, function (err) {
        if (err) {
          reject(err);
        }
        else {
          resolve(this.changes);
        }
      });
    });
  }

  async all(query, params, options, tx, write) {
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined) {
      params = this.adjust(params);
    }
    const client = tx ? tx.db : (write ? this.write : this.read);
    if (typeof query === 'string') {
      let key;
      if (options && options.cacheName) {
        key = options.cacheName;
      }
      else {
        key = query;
      }
      const statementKey = tx ? tx.name : (write ? 'write' : 'read');
      const statements = this.statements[statementKey];
      const cached = statements ? this.statements.get(key) : undefined;
      if (cached) {
        query = cached;
      }
      else {
        if (!statements) {
          this.statements[statementKey] = new Map();
        }
        const statement = await this.prepare(query, client);
        this.statements[statementKey].set(key, statement);
        query = statement;
      }
    }
    const db = this;
    return new Promise((resolve, reject) => {
      query.all(params, function (err, rows) {
        if (err) {
          reject(err);
        }
        else {
          const result = process(db, rows, options);
          resolve(result);
        }
      });
    });
  }

  async exec(sql) {
    return new Promise((resolve, reject) => {
      this.write.exec(sql, function (err) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  async close() {
    const makePromise = (db) => {
      return new Promise((resolve, reject) => {
        db.close(function (err) {
          if (err) {
            reject(err);
          }
          else {
            resolve();
          }
        });
      });
    }
    const promises = this.databases.map(db => makePromise(db));
    await Promise.all(promises);
  }
}

export default Database;
