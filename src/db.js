import sqlite3 from 'sqlite3';
import { toValue, toValues } from './utils.js';
import { parseOne, parseMany } from './parsers.js';
import { mapOne, mapMany } from './map.js';

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

const process = (result, options, one) => {
  const parser = one ? parseOne : parseMany;
  const mapper = one ? mapOne : mapMany;
  const value = one ? toValue : toValues;
  if (!options) {
    return result;
  }
  if (options.value) {
    if (options.parse) {
      const parsed = parseOne(result);
      return value(parsed);
    }
    return value(result);
  }
  if (options.parse) {
    return parser(result);
  }
  if (options.map) {
    return mapper(result, options.skip, options.prefixes);
  }
  return result;
}

const processResult = (result, options) => process(result, options, true);
const processResults = (result, options) => process(result, options, false);

class Database {
  constructor(path) {
    this.db = new sqlite3.Database(path);
  }

  async enforceForeignKeys() {
    await this.get('pragma foreign_keys = on');
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
    if (params !== null && params !== undefined) {
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
    if (params !== null && params !== undefined) {
      params = adjust(params);
    }
    if (typeof query === 'string') {
      const sql = query;
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, function (err, row) {
          if (err) {
            reject(err);
          }
          else {
            const result = processResult(row, options);
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
          const result = processResult(row, options);
          resolve(result);
        }
      });
    });
  }

  async all(query, params, options) {
    if (params !== null && params !== undefined) {
      params = adjust(params);
    }
    if (typeof query === 'string') {
      const sql = query;
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, function (err, rows) {
          if (err) {
            reject(err);
          }
          else {
            const result = processResults(rows, options);
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
          const result = processResults(rows, options);
          resolve(result);
        }
      });
    });
  }
}

export default Database;
