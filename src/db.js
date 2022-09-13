import sqlite3 from 'sqlite3';
import { toValue, toValues } from './utils.js';
import { parseOne, parseMany } from './parsers.js';
import { mapOne, mapMany } from './map.js';
import { getTables } from './sqlParsers/tables.js';
import { readFile } from 'fs/promises';
import { getFragments } from './sqlParsers/tables.js';

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
    this.customTypes = {};
    this.columns = {};
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
      this.columns[table.name] = {};
      for (const column of table.columns) {
        this.columns[table.name][column.name] = column.type;
      }
    }
  }

  registerParsers(parsers) {
    this.parsers.push(...parsers);
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

  registerTypes(customTypes) {
    for (const customType of customTypes) {
      const { name, ...options } = customType;
      this.customTypes[name] = options;
    }
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
      fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+\s+)([a-z0-9_]+)(\s+)/gmi, `$1${customType.dbType}$3`);
      if (customType.makeConstraint) {
        const constraint = customType.makeConstraint(fragment.columnName);
        fragment.sql += ' ';
        fragment.sql += constraint;
      }
      converted += fragment.sql;
    }
    return converted;
  }

  convertToDb(value) {
    for (const customType of Object.values(this.customTypes)) {
      if (customType.valueTest(value)) {
        return customType.jsToDb(value);
      }
    }
    return value;
  }

  convertToJs(table, column, value) {
    const type = this.columns[table][column];
    if (type === 'number' || type === 'string') {
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
    return this.customTypes[type].dbToJs;
  }

  adjust(params) {
    const adjusted = {};
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined) {
        value = null;
      }
      if (value === null || typeof value === 'string' || typeof value === 'number') {
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
