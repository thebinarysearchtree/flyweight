import sqlite3 from 'sqlite3';
import { toValue, toValues } from './utils.js';
import { parseOne, parseMany } from './parsers.js';
import { mapOne, mapMany } from './map.js';
import { getTables } from './sqlParsers/tables.js';
import { readFile } from 'fs/promises';
import { getFragments } from './sqlParsers/tables.js';
import { blank } from './sqlParsers/utils.js';
import { makeClient } from './proxy.js';
import { createTypes } from './sqlParsers/types.js';

const process = (db, result, options) => {
  if (!options) {
    return result;
  }
  let parser, mapper, value;
  if (options.result === 'object' || options.result === 'value') {
    parser = parseOne;
    mapper = mapOne;
    value = toValue;
  }
  else {
    parser = parseMany;
    mapper = mapMany;
    value = toValues;
  }
  if (options.result === 'value' || options.result === 'values') {
    if (options.parse) {
      const parsed = parser(result, options.types);
      return value(parsed);
    }
    return value(result);
  }
  if (options.parse && !options.map) {
    return parser(result, options.types);
  }
  if (options.map) {
    return mapper(db, result, options.prefixes, options.columns, options.types, options.primaryKeys);
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

class Database {
  constructor() {
    this.db = null;
    this.tables = {};
    this.mappers = {};
    this.customTypes = {};
    this.columns = {};
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
  }

  async initialize(paths, interfaceName) {
    const { db, sql, tables, types, extensions } = paths;
    this.db = new sqlite3.Database(db);
    await this.setTables(tables);
    const client = makeClient(this, sql);
    const makeTypes = () => createTypes({
      db: this,
      sqlDir: sql,
      createTablePath: tables,
      destinationPath: types,
      interfaceName
    });
    const getTables = async () => {
      const sql = await readFile(tables, 'utf8');
      return this.convertTables(sql);
    }
    if (extensions) {
      if (typeof extensions === 'string') {
        await this.loadExtension(extensions);
      }
      else {
        for (const extension of extensions) {
          await this.loadExtension(extension);
        }
      }
    }
    return {
      db: client,
      makeTypes,
      getTables
    }
  }

  async enforceForeignKeys() {
    await this.get('pragma foreign_keys = on');
  }

  async setTables(path) {
    const sql = await readFile(path, 'utf8');
    const tables = getTables(sql);
    for (const table of tables) {
      this.tables[table.name] = table.columns;
      this.columns[table.name] = {};
      for (const column of table.columns) {
        this.columns[table.name][column.name] = column.type;
      }
    }
  }

  registerTypes(customTypes) {
    for (const customType of customTypes) {
      const { name, ...options } = customType;
      this.customTypes[name] = options;
    }
  }

  addStrict(sql) {
    const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+)(?<ending>;)/gmid);
    let lastIndex = 0;
    const fragments = [];
    for (const match of matches) {
      const [index] = match.indices.groups.ending;
      const fragment = sql.substring(lastIndex, index);
      fragments.push(fragment);
      fragments.push(' strict');
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
      fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+\s+)([a-z0-9_]+)((\s+)|$)/gmi, `$1${customType.dbType}$3`);
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

  async begin() {
    await this.basicRun('begin');
  }

  async commit() {
    await this.basicRun('commit');
  }

  async rollback() {
    await this.basicRun('rollback');
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  async loadExtension(path) {
    return new Promise((resolve, reject) => {
      this.db.loadExtension(path, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  async basicRun(sql) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, undefined, function (err) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  async run(query, params) {
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined) {
      params = this.adjust(params);
    }
    if (typeof query === 'string') {
      const sql = query;
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function (err) {
          if (err) {
            reject(err);
          }
          else {
            resolve(this.changes);
          }
        });
      });
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

  async get(query, params, options) {
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined) {
      params = this.adjust(params);
    }
    const db = this;
    if (typeof query === 'string') {
      const sql = query;
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, function (err, row) {
          if (err) {
            reject(err);
          }
          else {
            const result = process(db, row, options);
            resolve(result);
          }
        });
      });
    }
    return new Promise((resolve, reject) => {
      query.get(params, function (err, row) {
        if (err) {
          reject(err);
        }
        else {
          const result = process(db, row, options);
          resolve(result);
        }
      });
    });
  }

  async all(query, params, options) {
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined) {
      params = this.adjust(params);
    }
    const db = this;
    if (typeof query === 'string') {
      const sql = query;
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, function (err, rows) {
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
}

export default Database;
