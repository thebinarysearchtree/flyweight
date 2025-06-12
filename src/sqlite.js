import Database from './db.js';
import { makeClient } from './proxy.js';

const isEmpty = (params) => {
  if (params === undefined) {
    return true;
  }
  return Object.keys(params).length === 0;
}

class SQLiteDatabase extends Database {
  constructor(props) {
    const supports = {
      jsonb: true,
      migrations: true,
      files: true,
      closing: true,
      types: 'sqlite'
    };
    super({ ...props, supports });
    this.dbPath = props.db;
    this.extensionsPath = props.extensions;
    this.adaptor = props.adaptor;
    this.sqlPath = props.sql;
    this.viewsPath = props.views;
    this.tablesPath = props.tables;
    this.computedPath = props.computed;
    this.extensionsPath = props.extensions;
    this.writer = null;
  }

  async getWriter() {
    let lock;
    while (true) {
      if (!this.writer) {
        lock = Promise.withResolvers();
        this.writer = lock.promise;
        break;
      }
      await this.writer;
    }
    return lock;
  }

  getConnection(tx, write) {
    return tx || write ? this.write : this.read;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
    this.read = await this.createDatabase();
    this.write = await this.createDatabase();
    await this.setTables();
    await this.setVirtual();
    await this.setViews();
    await this.setComputed();
    this.initialized = true;
  }

  async readQuery(table, queryName) {
    const path = this.adaptor.join(this.sqlPath, table, `${queryName}.sql`);
    return await this.adaptor.readFile(path, 'utf8');
  }

  async readTables() {
    return await this.adaptor.readSql(this.tablesPath);
  }

  async readViews() {
    return await this.adaptor.readSql(this.viewsPath);
  }

  async readComputed() {
    return await this.adaptor.readFile(this.computedPath, 'utf8');
  }

  async runMigration(sql) {
    const tx = await this.getTransaction();
    try {
      await tx.begin();
      await tx.deferForeignKeys();
      await tx.exec(sql);
      await tx.commit();
    }
    catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async getSample(table, column) {
    const sql = `select json(${column}) as ${column} from ${table} order by rowid desc limit 100`;
    return this.read.prepare(sql).all().map(r => JSON.parse(r[column]));
  }

  async createDatabase() {
    const db = new this.adaptor.sqlite3(this.dbPath);
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
    return db;
  }

  async enableForeignKeys(db) {
    db.pragma('foreign_keys = on');
  }

  async deferForeignKeys(tx) {
    await this.pragma(tx, 'defer_foreign_keys = true');
  }

  async getTransaction() {
    if (!this.initialized) {
      await this.initialize();
    }
    const writer = await this.getWriter();
    const tx = { db: this.write, writer };
    return makeClient(this, tx);
  }

  async loadExtension(path, db) {
    db.loadExtension(path);
  }

  async pragma(tx, sql) {
    const client = this.getConnection(tx);
    return client.pragma(sql);
  }

  async begin(tx) {
    await this.basicRun('begin', tx);
  }

  async commit(tx) {
    await this.basicRun('commit', tx);
    this.writer = null;
    tx.writer.resolve();
  }

  async rollback(tx) {
    await this.basicRun('rollback', tx);
    this.writer = null;
    tx.writer.resolve();
  }

  async getError(sql) {
    return this.read.prepare(sql);
  }

  async basicRun(sql, tx) {
    if (!tx && !this.initialized) {
      await this.initialize();
    }
    const statement = this.write.prepare(sql);
    let lock;
    if (!tx) {
      lock = await this.getWriter();
    }
    statement.run();
    if (lock) {
      this.writer = null;
      lock.resolve();
    }
  }

  async basicAll(sql, tx) {
    if (!tx && !this.initialized) {
      await this.initialize();
    }
    const client = this.getConnection(tx);
    const statement = client.prepare(sql);
    return statement.all();
  }

  async insertBatch(inserts) {
    const lock = await this.getWriter();
    const inserted = this.write.transaction(() => {
      for (const insert of inserts) {
        const { query, params } = insert;
        const statement = this.write.prepare(query);
        statement.run(params);
      }
    });
    inserted();
    this.writer = null;
    lock.resolve();
  }

  async batch(handler) {
    const client = makeClient(this, { isBatch: true });
    const promises = handler(client).flat();
    const handlers = await Promise.all(promises);
    const result = this.write.transaction(() => {
      const responses = [];
      const flat = handlers.flat();
      for (const handler of flat) {
        const { statement, params, post } = handler;
        const run = post ? 'all' : 'run';
        let response = isEmpty(params) ? statement[run]() : statement[run](params);
        if (post) {
          response = post(response);
        }
        responses.push(response);
      }
      return responses;
    });
    return result();
  }

  async run(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, tx, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    if (typeof query === 'string') {
      const key = query + 'write';
      const cached = this.statements.get(key);
      if (cached) {
        query = cached;
      }
      else {
        const statement = this.write.prepare(query);
        this.statements.set(key, statement);
        query = statement;
      }
    }
    if (tx && tx.isBatch) {
      return {
        statement: query,
        params
      };
    }
    let lock;
    if (!tx) {
      lock = await this.getWriter();
    }
    const result = isEmpty(params) ? query.run() : query.run(params);
    if (lock) {
      this.writer = null;
      lock.resolve();
    }
    return result.changes;
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
    const client = this.getConnection(tx, write);
    if (typeof query === 'string') {
      const name = tx || write ? 'write' : 'read';
      const key = query + name;
      const cached = this.statements.get(key);
      if (cached) {
        query = cached;
      }
      else {
        const statement = client.prepare(query);
        this.statements.set(key, statement);
        query = statement;
      }
    }
    const process = this.process;
    if (tx && tx.isBatch) {
      return {
        statement: query,
        params,
        post: (rows) => this.process(rows, options)
      };
    }
    let lock;
    if (!tx && write) {
      lock = await this.getWriter();
    }
    const rows = isEmpty(params) ? query.all() : query.all(params);
    if (lock) {
      this.writer = null;
      lock.resolve();
    }
    return process(rows, options);
  }

  async exec(tx, sql) {
    if (!this.initialized) {
      await this.initialize();
    }
    let lock;
    if (!tx) {
      lock = await this.getWriter();
    }
    this.write.exec(sql);
    if (lock) {
      this.writer = null;
      lock.resolve();
    }
  }

  async close() {
    if (this.closed || !this.initialized) {
      return;
    }
    this.read.close();
    this.write.close();
    this.closed = true;
  }
}

export default SQLiteDatabase;
