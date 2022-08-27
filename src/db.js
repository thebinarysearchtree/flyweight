import sqlite3 from 'sqlite3';

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

class Database {
  constructor(path) {
    this.db = new sqlite3.Database(path);
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

  async get(query, params) {
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
            resolve(row);
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
          resolve(row);
        }
      });
    });
  }

  async all(query, params) {
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
            resolve(rows);
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
          resolve(rows);
        }
      });
    });
  }
}

export default Database;
