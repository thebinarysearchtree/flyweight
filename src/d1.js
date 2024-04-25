import { join, readFile } from './files.js';
import Database from './db.js';
import { parseParams } from './parsers/types.js';
import { blank } from './parsers/utils.js';

const d1 = env.DB;

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
  }

  async runMigration(name) {
    const path = join(this.migrationPath, `${name}.sql`);
    const sql = await readFile(path, 'utf8');
    const defer = d1.prepare('pragma defer_foreign_keys = true');
    const statements = sql.split(';').map(s => d1.prepare(s));
    try {
      await d1.batch([defer, ...statements]);
    }
    catch (e) {
      await this.rollback();
      throw e;
    }
  }

  async createDatabase() {
    return d1;
  }

  async basicRun(sql) {
    const statement = d1.prepare(sql);
    return await statement.run();
  }

  async basicAll(sql) {
    const statement = d1.prepare(sql);
    const meta = await statement.all();
    return meta.result;
  }

  async prepare(sql) {
    return d1.prepare(sql);
  }

  cache(query, params) {
    let cached;
    let statement;
    let placeholders;
    if (typeof query === 'string') {
      cached = this.statements.get(query);
      if (!cached) {
        const mapped = parseParams(query).map((p, i) => [p, i + 1]);
        placeholders = new Map(mapped);
        const sql = replacePlaceholders(query);
        statement = d1.prepare(sql);
        cached = {
          statement,
          placeholders
        };
        this.statements.set(query, cached);
        this.statements.set(statement, placeholders);
      }
    }
    else {
      placeholders = this.statements.get(query);
      statement = query;
    }
    const ordered = [];
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        const index = placeholders.get(key);
        ordered[index] = value;
      }
    }
    return {
      statement,
      ordered
    }
  }

  async run(props) {
    let { query, params, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const cached = cache(query, params);
    const { statement, ordered } = cached;
    await statement.bind(...ordered).run();
  }

  async all(props) {
    let { query, params, options, tx, write, adjusted } = props;
    if (params === null) {
      params = undefined;
    }
    if (params !== undefined && !adjusted) {
      params = this.adjust(params);
    }
    const cached = cache(query, params);
    const { statement, ordered } = cached;
    const process = this.process;
    const meta = await statement.bind(...ordered).all();
    return process(meta.result, options);
  }

  async exec(sql) {
    await d1.exec(sql);
  }
}

export default D1Database;
