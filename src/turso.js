import Database from './db.js';
import { makeClient } from './proxy.js';
import { isWrite } from './parsers/queries.js';

class TursoDatabase extends Database {
  constructor(props) {
    super(props);
    this.raw = props.db;
    this.adaptor = props.adaptor;
    this.sqlPath = props.sql;
    this.typesPath = props.types;
    this.viewsPath = props.views;
    this.tablesPath = props.tables;
    this.migrationsPath = props.migrations;
    this.extensionsPath = props.extensions;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
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
    const defer = 'pragma defer_foreign_keys = true';
    const split = sql.split(';').filter(s => s.length > 2);
    const statements = [defer, ...split].map(sql => ({ sql, args: [] }));
    try {
      await this.raw.batch(statements, 'write');
    }
    catch (e) {
      throw e;
    }
  }

  async getTransaction(type) {
    if (!this.initialized) {
      await this.initialize();
    }
    const db = await this.raw.transaction(type);
    return makeClient(this, { db });
  }

  async begin(tx) {
    await tx.db.begin();
  }

  async commit(tx) {
    await tx.db.commit();
  }

  async rollback(tx) {
    await tx.db.rollback();
  }

  async basicRun(sql) {
    return await this.raw.execute(sql);
  }

  async basicAll(sql) {
    const meta = await this.raw.execute(sql);
    return meta.rows;
  }

  async batch(handler) {
    const client = makeClient(this, { isBatch: true, dbType: 'turso' });
    const handlers = handler(client).flat();
    const results = await Promise.all(handlers);
    const statements = results.map(r => r.statement);
    const batchType = statements.some(s => isWrite(s.sql)) ? 'write' : 'read';
    const responses = await this.raw.batch(results.map(r => r.statement), batchType);
    return responses.map((response, i) => {
      const handler = results[i];
      if (handler.post) {
        return handler.post(response);
      }
      return response;
    });
  }

  async run(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, adjusted, tx } = props;
    if (props.statement) {
      return await this.raw.execute(statement);
    }
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const statement = {
      sql: query,
      args: params
    };
    if (tx && tx.isBatch) {
      return statement;
    }
    await this.raw.execute(statement);
  }

  async all(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, options, adjusted, tx } = props;
    if (props.statement) {
      const meta = await this.raw.execute(statement);
      return this.process(meta.rows, options);
    }
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const statement = {
      sql: query,
      args: params
    };
    if (tx && tx.isBatch) {
      return {
        statement,
        post: (meta) => this.process(meta.rows, options)
      }
    }
    const meta = await this.raw.execute(statement);
    return this.process(meta.rows, options);
  }

  async exec(sql) {
    await this.raw.execute(sql);
  }
}

export default TursoDatabase;
