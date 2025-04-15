import Database from './db.js';
import { makeClient } from './proxy.js';
import { isWrite } from './parsers/queries.js';

class TursoDatabase extends Database {
  constructor(props) {
    const supports = {
      jsonb: true,
      migrations: true,
      files: false,
      closing: false,
      types: 'turso'
    };
    super({ ...props, supports });
    this.raw = props.db;
    this.files = props.files;
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
    return this.files.queries[table][queryName];
  }

  async readTables() {
    return this.files.tables;
  }

  async readViews() {
    return this.files.views;
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

  async getSample(table, column) {
    const sql = `select json(${column}) as ${column} from ${table} order by rowid desc limit 100`;
    const statement = {
      sql,
      args: {}
    };
    const meta = await this.raw.execute(statement);
    return meta.rows.map(r => JSON.parse(r[column]));
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

  async sync() {
    await this.raw.sync();
  }

  async getError(sql) {
    return this.raw.execute(sql);
  }

  async basicRun(sql) {
    return await this.raw.execute(sql);
  }

  async basicAll(sql) {
    const meta = await this.raw.execute(sql);
    return meta.rows;
  }

  async insertBatch(inserts) {
    const mapped = inserts.map(insert => {
      return {
        sql: insert.query,
        args: insert.params
      }
    });
    await this.raw.batch(mapped, 'write');
  }

  async batch(handler) {
    const client = makeClient(this, { isBatch: true });
    const handlers = handler(client).flat();
    const results = await Promise.all(handlers);
    const flat = results.flat();
    const statements = flat.map(r => r.statement);
    const batchType = statements.some(s => isWrite(s.sql)) ? 'write' : 'read';
    const responses = await this.raw.batch(flat.map(r => r.statement), batchType);
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
    const isBatch = tx && tx.isBatch;
    if (props.statement && !isBatch) {
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
      args: params || {}
    };
    if (isBatch) {
      return statement;
    }
    await this.raw.execute(statement);
  }

  async all(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, options, adjusted, tx } = props;
    const isBatch = tx && tx.isBatch;
    if (props.statement && !isBatch) {
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
      args: params || {}
    };
    if (isBatch) {
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
