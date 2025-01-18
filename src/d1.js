import Database from './db.js';
import { parseParams } from './parsers/types.js';
import { blank } from './parsers/utils.js';
import { makeClient } from './proxy.js';

const replacePlaceholders = (sql, placeholderMap) => {
  const fragments = [];
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/(\s|,|\()\$(?<param>[a-z0-9_]+)(\s|,|\)|$)/gmid);
  let lastEnd = 0;
  for (const match of matches) {
    const [start, end] = match.indices.groups.param;
    const index = placeholderMap.get(match.groups.param);
    if (lastEnd !== start) {
      fragments.push(sql.substring(lastEnd, start));
    }
    fragments.push(index);
    lastEnd = end;
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join('');
}

class D1Database extends Database {
  constructor(props) {
    const supports = {
      jsonb: false,
      migrations: false,
      files: false,
      closing: false,
      types: 'd1'
    };
    super({ ...props, supports });
    this.files = props.files;
    this.raw = props.db;
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

  async readFile(sql, params) {
    const statement = this.raw.prepare(sql);
    if (params) {
      statement.bind(...params);
    }
    const meta = await statement.all();
    if (meta.result.length === 0) {
      throw Error('File does not exist');
    }
    return meta.result[0].sql;
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
    const defer = this.raw.prepare('pragma defer_foreign_keys = true');
    const statements = sql
      .split(';')
      .filter(s => s.length > 2)
      .map(s => raw.prepare(s));
    try {
      await this.raw.batch([defer, ...statements]);
    }
    catch (e) {
      throw e;
    }
  }

  async getError(sql) {
    return this.raw.prepare(sql);
  }

  async basicRun(sql) {
    const statement = this.raw.prepare(sql);
    return await statement.run();
  }

  async basicAll(sql) {
    const statement = this.raw.prepare(sql);
    const meta = await statement.all();
    return meta.result;
  }

  async prepare(sql) {
    return this.raw.prepare(sql);
  }

  async batch(handler) {
    const client = makeClient(this, { isBatch: true });
    const handlers = handler(client).flat();
    const results = await Promise.all(handlers);
    const responses = await this.raw.batch(results.map(r => r.statement));
    return responses.map((response, i) => {
      const handler = results[i];
      if (handler.post) {
        return handler.post(response);
      }
      return response;
    });
  }

  cache(query, params) {
    let placeholdersMap;
    let sql;
    const cached = this.statements.get(query);
    if (!cached) {
      const mapped = parseParams(query).map((p, i) => [p, i + 1]);
      placeholdersMap = new Map(mapped);
      sql = replacePlaceholders(query, placeholdersMap);
      const cached = {
        placeholdersMap,
        sql
      };
      this.statements.set(query, cached);
    }
    else {
      sql = cached.sql;
      placeholdersMap = cached.placeholdersMap;
    }
    const orderedParams = [];
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        const param = key.substring(1);
        const index = placeholdersMap.get(param);
        orderedParams[index - 1] = value;
      }
    }
    return {
      sql,
      orderedParams
    }
  }

  async run(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, adjusted, tx } = props;
    if (props.statement) {
      return await props.statement.run();
    }
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const { sql, orderedParams } = this.cache(query, params);
    const statement = this.raw.prepare(sql).bind(...orderedParams);
    if (tx && tx.isBatch) {
      return {
        statement
      }
    }
    await statement.run();
  }

  async all(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, options, adjusted, tx } = props;
    if (props.statement) {
      const meta = await statement.all();
      return this.process(meta.results, options);
    }
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const { sql, orderedParams } = this.cache(query, params);
    const statement = this.raw.prepare(sql).bind(...orderedParams);
    if (tx && tx.isBatch) {
      return {
        statement,
        post: (meta) => this.process(meta.results, options)
      }
    }
    const meta = await statement.all();
    return this.process(meta.results, options);
  }

  async exec(sql) {
    await this.raw.exec(sql);
  }
}

export default D1Database;
