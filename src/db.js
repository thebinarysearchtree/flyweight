import sqlite3 from 'sqlite3';
import { toValue, toValues } from './utils.js';
import { parseOne, parseMany } from './parsers.js';
import { mapOne, mapMany } from './map.js';
import { getTables } from './sqlParsers/tables.js';
import { readFile } from 'fs/promises';

const adjust = (params) => {
  const adjusted = {};
  for (let [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && (Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value))) {
      value = JSON.stringify(value);
    }
    else if (value instanceof RegExp) {
      value = value.source;
    }
    adjusted[`$${key}`] = value;
  }
  return adjusted;
}

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
      const parsed = parser(db, result);
      return value(parsed);
    }
    return value(result);
  }
  if (options.parse && !options.map) {
    return parser(db, result);
  }
  if (options.map || options.skip || options.prefixes) {
    const columns = options.renameColumns ? options.columns : undefined;
    return mapper(db, result, options.skip, options.prefixes, columns);
  }
  return result;
}

class Database {
  constructor(path) {
    this.db = new sqlite3.Database(path);
    this.tables = {};
    this.parsers = [];
    this.mappers = {};
  }

  async enforceForeignKeys() {
    await this.get('pragma foreign_keys = on');
  }

  async setTables(path) {
    let tables;
    if (path) {
      const sql = await readFile(path, 'utf8');
      tables = getTables(sql);
    }
    else {
      tables = await getTables(this);
    }
    for (const table of tables) {
      this.tables[table.name] = table.columns;
    }
  }

  registerParser(parser) {
    this.parsers.push(parser);
  }

  registerMappers(table, mappers) {
    if (!this.mappers[table]) {
      this.mappers[table] = {};
    }
    for (const mapper of mappers) {
      const { query, ...options } = mapper;
      if (options.parse === undefined) {
        options.parse = true;
      }
      if (options.result === undefined) {
        options.result = 'array';
      }
      if (options.map === undefined && (options.skip || options.prefixes)) {
        options.map = true;
      }
      if (options.renameColumns === undefined) {
        options.renameColumns = true;
      }
      this.mappers[table][query] = options;
    }
  }

  getMapper(table, query) {
    const defaultMapper = {
      parse: true,
      result: 'array'
    }
    if (!this.mappers[table]) {
      return defaultMapper;
    }
    const mapper = this.mappers[table][query];
    if (!mapper) {
      return defaultMapper;
    }
    return mapper;
  }

  parseKey(key) {
    const dbToJsParsers = this.parsers.filter(p => p.dbToJs);
    for (const parser of dbToJsParsers) {
      const { pattern, dbPattern, type, trim } = parser;
      if ((pattern && pattern.test(key) || (dbPattern && dbPattern.test(key)))) {
        let parsedKey;
        if (trim) {
          parsedKey = key.substring(0, key.length - trim.length);
        }
        else {
          parsedKey = key;
        }
        return {
          key: parsedKey,
          type
        };
      }
    }
    return null;
  }

  getDbToJsParser(key) {
    const dbToJsParsers = this.parsers.filter(p => p.dbToJs);
    for (const parser of dbToJsParsers) {
      const { pattern, dbToJs, trim, dbPattern } = parser;
      if ((pattern && pattern.test(key) || (dbPattern && dbPattern.test(key)))) {
        const parse = (key, value) => {
          const parsedKey = trim ? key.substring(0, key.length - trim.length) : key;
          const parsedValue = dbToJs(value);
          return [parsedKey, parsedValue];
        }
        return parse;
      }
    }
    return null;
  }

  getJsToDbParser(key, value) {
    const jsToDbParsers = this.parsers.filter(p => p.jsToDb);
    for (const parser of jsToDbParsers) {
      const { pattern, jsToDb, valueTest, jsPattern } = parser;
      if ((pattern && pattern.test(key)) || (jsPattern && jsPattern.test(key)) || (valueTest && valueTest(value))) {
        return jsToDb;
      }
    }
    return null;
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

  async basicRun(sql) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, null, function (err) {
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
      params = adjust(params);
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
      params = adjust(params);
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
      params = adjust(params);
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
