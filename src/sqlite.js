import Database from './db.js';
import { makeClient } from './proxy.js';

const wait = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 100);
  });
}

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
    this.extensionsPath = props.extensions;
    this.isBusy = false;
  }

  async getWriter() {
    if (!this.isBusy) {
      this.isBusy = true;
      return;
    }
    while (this.isBusy) {
      await wait();
    }
    this.isBusy = true;
    return;
  }

  getConnection(tx, write) {
    if (tx) {
      return {
        client: this.transact,
        name: 'transact'
      };
    }
    else if (write) {
      return {
        client: this.write,
        name: 'write'
      };
    }
    return {
      client: this.read,
      name: 'read'
    };
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
    this.read = await this.createDatabase();
    this.write = await this.createDatabase();
    this.transact = await this.createDatabase();
    await this.setTables();
    await this.setVirtual();
    await this.setViews();
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

  async runMigration(sql) {
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

  async deferForeignKeys() {
    await this.pragma('defer_foreign_keys = true');
  }

  async getTransaction() {
    if (!this.initialized) {
      await this.initialize();
    }
    await this.getWriter();
    const tx = { db: this.transact };
    return makeClient(this, tx);
  }

  async loadExtension(path, db) {
    db.loadExtension(path);
  }

  async pragma(sql) {
    this.read.pragma(sql);
  }

  async begin(tx) {
    await this.basicRun('begin', tx);
  }

  async commit(tx) {
    await this.basicRun('commit', tx);
    this.isBusy = false;
  }

  async rollback(tx) {
    await this.basicRun('rollback', tx);
    this.isBusy = false;
  }

  async getError(sql) {
    return this.read.prepare(sql);
  }

  async basicRun(sql, tx) {
    if (!tx && !this.initialized) {
      await this.initialize();
    }
    const { client } = this.getConnection(tx);
    const statement = client.prepare(sql);
    statement.run();
  }

  async basicAll(sql, tx) {
    if (!tx && !this.initialized) {
      await this.initialize();
    }
    const { client } = this.getConnection(tx);
    const statement = client.prepare(sql);
    return statement.all();
  }

  async insertBatch(inserts) {
    const inserted = this.write.transaction(() => {
      for (const insert of inserts) {
        const { query, params } = insert;
        const statement = this.write.prepare(query);
        statement.run(params);
      }
    });
    inserted();
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
    const { client, name } = this.getConnection(tx, true);
    if (typeof query === 'string') {
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
    if (tx && tx.isBatch) {
      return {
        statement: query,
        params
      };
    }
    const result = isEmpty(params) ? query.run() : query.run(params);
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
    const { client, name } = this.getConnection(tx, write);
    if (typeof query === 'string') {
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
    const rows = isEmpty(params) ? query.all() : query.all(params);
    return process(rows, options);
  }

  async exec(sql) {
    if (!this.initialized) {
      await this.initialize();
    }
    this.write.exec(sql);
  }

  async close() {
    if (this.closed) {
      return;
    }
    this.read.close();
    this.write.close();
    this.transact.close();
    this.closed = true;
  }
}

export default SQLiteDatabase;
