import Database from './db.js';
import { parseParams } from './parsers/types.js';
import { blank } from './parsers/utils.js';
import FileSystem from './strings.js';

const replacePlaceholders = (sql, placeholderMap) => {
  const fragments = [];
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/(\s|,|\()\$(?<param>[a-z0-9_]+)(\s|,|\)|$)/gmi);
  let lastEnd = 0;
  for (const match of matches) {
    const [start, end] = match.indices.groups.placeholder;
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
    super(props);
    this.d1 = props.d1;
    this.fileSystem = new FileSystem(this);
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

  async runMigration(sql) {
    const defer = this.d1.prepare('pragma defer_foreign_keys = true');
    const statements = sql.split(';').map(s => d1.prepare(s));
    try {
      await this.d1.batch([defer, ...statements]);
    }
    catch (e) {
      await this.rollback();
      throw e;
    }
  }

  async basicRun(sql) {
    const statement = this.d1.prepare(sql);
    return await statement.run();
  }

  async basicAll(sql) {
    const statement = this.d1.prepare(sql);
    const meta = await statement.all();
    return meta.result;
  }

  async prepare(sql) {
    return this.d1.prepare(sql);
  }

  cache(query, params) {
    let placeholdersMap;
    let sql;
    const cached = this.statements.get(query);
    if (!cached) {
      const mapped = parseParams(query).map((p, i) => [p, i + 1]);
      placeholdersMap = new Map(mapped);
      sql = replacePlaceholders(query);
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
        const index = placeholdersMap.get(key);
        orderedParams[index] = value;
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
    let { query, params, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const { sql, orderedParams } = this.cache(query, params);
    await this.d1.prepare(sql).bind(...orderedParams).run();
  }

  async all(props) {
    if (!this.initialized) {
      await this.initialize();
    }
    let { query, params, options, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const { sql, orderedParams } = this.cache(query, params);
    const meta = await this.d1.prepare(sql).bind(...orderedParams).all();
    return this.process(meta.result, options);
  }

  async exec(sql) {
    await this.d1.exec(sql);
  }
}

export default D1Database;
