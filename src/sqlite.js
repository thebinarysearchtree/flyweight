import Database from './db.js';
import sqlite3 from 'sqlite3';
import { readFile, writeFile, join, rm } from './files.js';
import { makeClient } from './proxy.js';
import { readSql } from './utils.js';

class SQLiteDatabase extends Database {
  constructor(props) {
    super(props);
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
    this.read = await this.createDatabase();
    this.write = await this.createDatabase({ serialize: true });
    await this.setTables();
    await this.setVirtual();
    await this.setViews();
    this.initialized = true;
  }

  async readQuery(table, queryName) {
    const path = join(this.sqlPath, table, `${queryName}.sql`);
    return await readFile(path, 'utf8');
  }

  async readTables() {
    return await readSql(this.tablesPath);
  }

  async readViews() {
    return await readSql(this.viewsPath);
  }

  async runMigration(name) {
    const path = join(this.migrationsPath, `${name}.sql`);
    const sql = await readFile(path, 'utf8');
    try {
      await this.begin();
      await this.deferForeignKeys();
      await this.exec(sql);
      await this.commit();
    }
    catch (e) {
      await this.rollback();
      throw e;
    }
  }

  async createDatabase(options) {
    const serialize = options ? options.serialize : false;
    const db = new sqlite3.Database(this.dbPath);
    if (serialize) {
      db.serialize();
    }
    await this.enableForeignKeys(db);
    if (this.extensionsPath) {
      if (typeof this.extensionsPath === 'string') {
        await this.loadExtension(this.extensionsPath, db);
      }
      else {
        for (const extension of this.extensionsPath) {
          await this.loadExtension(extension, db);
        }
      }
    }
    this.databases.push(db);
    return db;
  }

  async getTransaction() {
    if (!this.initialized) {
      await this.initialize();
    }
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
    if (!tx && !this.initialized) {
      await this.initialize();
    }
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
    if (!tx && !this.initialized) {
      await this.initialize();
    }
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
          this.prepared.push(statement);
          resolve(statement);
        }
      });
    });
  }

  async finalize(statement) {
    return new Promise((resolve) => {
      statement.finalize(() => resolve());
    });
  }

  release(tx) {
    this.pool.push(tx);
  }

  async run(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, options, tx, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const db = tx ? tx.db : this.write;
    if (typeof query === 'string') {
      const statementKey = tx ? tx.name : 'write';
      let statements = this.statements.get(statementKey);
      const cached = statements ? statements.get(query) : undefined;
      if (cached) {
        query = cached;
      }
      else {
        if (!statements) {
          statements = new Map();
          this.statements.set(statementKey, statements);
        }
        const statement = await this.prepare(query, db);
        statements.set(query, statement);
        query = statement;
      }
    }
    return new Promise((resolve, reject) => {
      query.run(params, function (err) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  async all(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, options, tx, write, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const client = tx ? tx.db : (write ? this.write : this.read);
    if (typeof query === 'string') {
      const key = query;
      const statementKey = tx ? tx.name : (write ? 'write' : 'read');
      let statements = this.statements.get(statementKey);
      const cached = statements ? statements.get(key) : undefined;
      if (cached) {
        query = cached;
      }
      else {
        if (!statements) {
          statements = new Map();
          this.statements.set(statementKey, statements);
        }
        const statement = await this.prepare(query, client);
        statements.set(key, statement);
        query = statement;
      }
    }
    const process = this.process;
    return new Promise((resolve, reject) => {
      query.all(params, function (err, rows) {
        if (err) {
          reject(err);
        }
        else {
          const result = process(rows, options);
          resolve(result);
        }
      });
    });
  }

  async exec(sql) {
    if (!this.initialized) {
      await this.initialize();
    }
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
    if (this.closed) {
      return;
    }
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
    const finalizePromises = this.prepared.map(statement => this.finalize(statement));
    await Promise.all(finalizePromises);
    const promises = this.databases.map(db => makePromise(db));
    await Promise.all(promises);
    this.closed = true;
  }
}

export default SQLiteDatabase;
