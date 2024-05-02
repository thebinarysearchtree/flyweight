import { toValues } from './utils.js';
import { parse } from './parsers.js';
import { mapOne, mapMany } from './map.js';
import { getTables, getViews, getVirtual } from './parsers/tables.js';
import { getFragments } from './parsers/tables.js';
import { blank } from './parsers/utils.js';
import { preprocess } from './parsers/preprocessor.js';
import { createTypes } from './parsers/types.js';
import { migrate } from './migrations.js';
import { makeClient } from './proxy.js';

const dbTypes = {
  integer: true,
  int: true,
  real: true,
  text: true,
  blob: true,
  any: true
}

const typeMap = {
  integer: 'Number',
  real: 'Number',
  text: 'String',
  blob: 'Buffer',
  any: 'Number | String | Buffer | null'
}

const wait = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 100);
  });
}

class Database {
  constructor(props) {
    this.read = null;
    this.write = null;
    this.tables = {};
    this.columnSets = {};
    this.mappers = {};
    this.customTypes = {};
    this.columns = {};
    this.statements = new Map();
    this.viewSet = new Set();
    this.pool = [];
    this.poolSize = 100;
    this.dbPath = null;
    this.sqlPath = null;
    this.typesPath = null;
    this.viewsPath = null;
    this.tablesPath = null;
    this.migrationsPath = null;
    this.extensionsPath = null;
    this.transactionCount = 0;
    this.databases = [];
    this.virtualSet = new Set();
    this.prepared = [];
    this.debug = props ? props.debug : false;
    this.queryVariations = new Map();
    this.closed = false;
    this.initialized = false;
    this.registerTypes([
      {
        name: 'boolean',
        valueTest: (v) => typeof v === 'boolean',
        makeConstraint: (column) => `check (${column} in (0, 1))`,
        dbToJs: (v) => Boolean(v),
        jsToDb: (v) => v === true ? 1 : 0,
        tsType: 'boolean',
        dbType: 'integer'
      },
      {
        name: 'date',
        valueTest: (v) => v instanceof Date,
        dbToJs: (v) => new Date(v),
        jsToDb: (v) => v.toISOString(),
        tsType: 'Date',
        dbType: 'text'
      },
      {
        name: 'json',
        valueTest: (v) => Object.getPrototypeOf(v) === Object.prototype || Array.isArray(v),
        dbToJs: (v) => JSON.parse(v),
        jsToDb: (v) => JSON.stringify(v),
        tsType: 'any',
        dbType: 'text'
      },
      {
        name: 'jsonb',
        tsType: 'Buffer',
        dbType: 'blob'
      }
    ]);
    const { sql, tables, views, types, migrations } = props;
    this.sqlPath = sql;
    this.typesPath = types;
    this.viewsPath = views;
    this.tablesPath = tables;
    this.migrationsPath = migrations;
  }

  async makeTypes(fileSystem) {
    if (!this.initialized) {
      await this.initialize();
    }
    await createTypes({
      db: this,
      sqlDir: this.sqlPath,
      destinationPath: this.typesPath,
      fileSystem
    });
  }

  getClient() {
    return makeClient(this, this.sqlPath);
  }

  async getTables() {
    if (!this.initialized) {
      await this.initialize();
    }
    const sql = await this.readTables();
    return this.convertTables(sql);
  }

  async readQuery(table, name) {
    return;
  }

  async readTables() {
    return;
  }

  async readViews() {
    return;
  }

  async createMigration(fileSystem, name) {
    if (!this.initialized) {
      await this.initialize();
    }
    const sql = await migrate(fileSystem, this, name);
    return sql.trim();
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

  async runMigration() {
    return;
  }

  async createDatabase() {
    return;
  }

  async enableForeignKeys(db) {
    await this.basicAll('pragma foreign_keys = on', db);
  }

  async deferForeignKeys() {
    await this.basicAll('pragma defer_foreign_keys = true');
  }

  addTables(tables) {
    for (const table of tables) {
      this.tables[table.name] = table.columns;
      this.columnSets[table.name] = table.columnSet;
      this.columns[table.name] = {};
      for (const column of table.columns) {
        this.columns[table.name][column.name] = column.type;
      }
    }
  }

  async setTables() {
    const sql = await this.readTables();
    if (!sql.trim()) {
      return;
    }
    const tables = getTables(sql);
    this.addTables(tables);
  }

  async setViews() {
    let sql = await this.readViews();
    if (!sql.trim()) {
      return;
    }
    sql = sql.split(';').map(s => preprocess(s.trim(), this.tables, true)).join(';\n\n').slice(0, -1);
    const views = getViews(sql, this);
    for (const view of views) {
      this.viewSet.add(view.name);
    }
    this.addTables(views);
  }

  async setVirtual() {
    const sql = await this.readTables();
    if (!sql.trim()) {
      return;
    }
    const tables = getVirtual(sql);
    this.addTables(tables);
    for (const table of tables) {
      this.virtualSet.add(table.name);
      this.columnSets[table.name].add(table.name);
    }
  }

  registerTypes(customTypes) {
    for (const customType of customTypes) {
      const { name, ...options } = customType;
      if (options.dbType && !options.tsType) {
        options.tsType = typeMap[options.dbType];
      }
      if (name.includes(',')) {
        const names = name.split(',').map(n => n.trim());
        for (const name of names) {
          this.customTypes[name] = options;
        }
      }
      else {
        this.customTypes[name] = options;
      }
    }
  }

  addStrict(sql) {
    const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)(?<without>\s+without\s+rowid\s*)?(?<ending>;)/gmid);
    let lastIndex = 0;
    const fragments = [];
    for (const match of matches) {
      const [index] = match.indices.groups.ending;
      const fragment = sql.substring(lastIndex, index);
      fragments.push(fragment);
      if (match.groups.without) {
        fragments.push(', strict');
      }
      else {
        fragments.push(' strict');
      }
      lastIndex = index;
    }
    const fragment = sql.substring(lastIndex);
    fragments.push(fragment);
    return fragments.join('');
  }

  convertDefaults(sql) {
    let lastIndex = 0;
    let fragments = [];
    const blanked = blank(sql, { stringsOnly: true });
    const matches = blanked.matchAll(/\sdefault\s+(?<value>true|false|now\(\))(\s|,|$)/gmid);
    for (const match of matches) {
      const [start, end] = match.indices.groups.value;
      if (lastIndex !== start) {
        fragments.push(sql.substring(lastIndex, start));
      }
      lastIndex = end;
      const map = {
        'true': '1',
        'false': '0',
        'now()': `(date() || 'T' || time() || '.000Z')`
      };
      fragments.push(map[match.groups.value]);
    }
    fragments.push(sql.substring(lastIndex));
    return fragments.join('');
  }

  convertTables(sql) {
    sql = this.convertDefaults(sql);
    const fragments = getFragments(sql);
    let converted = '';
    for (const fragment of fragments) {
      if (!fragment.isColumn) {
        converted += fragment.sql;
        continue;
      }
      const customType = this.customTypes[fragment.type];
      if (!customType) {
        converted += fragment.sql;
        continue;
      }
      const match = /^\s*(?<name>[a-z0-9_]+)((\s+not\s+)|(\s+primary\s+)|(\s+references\s+)|(\s+check(\s+|\())|\s*$)/gmi.exec(fragment.sql);
      if (match) {
        fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+)(\s+|$)/gmi, `$1 ${customType.dbType}$2`);
      }
      else {
        fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+\s+)([a-z0-9_]+)((\s+)|$)/gmi, `$1${customType.dbType}$3`);
      }
      if (customType.makeConstraint) {
        const constraint = customType.makeConstraint(fragment.columnName);
        fragment.sql += ' ';
        fragment.sql += constraint;
      }
      converted += fragment.sql;
    }
    return this.addStrict(converted);
  }

  needsParsing(table, keys) {
    for (const key of keys) {
      if (key === 'count') {
        continue;
      }
      const type = this.columns[table][key];
      if (!dbTypes[type]) {
        return true;
      }
    }
    return false;
  }

  getPrimaryKey(table) {
    const primaryKey = this.tables[table].find(c => c.primaryKey);
    return primaryKey.name;
  }

  convertToJs(table, column, value) {
    if (value === null) {
      return value;
    }
    const type = this.columns[table][column];
    if (dbTypes[type]) {
      return value;
    }
    const customType = this.customTypes[type];
    if (customType.dbToJs) {
      return customType.dbToJs(value);
    }
    return value;
  }

  getDbToJsConverter(type) {
    const customType = this.customTypes[type];
    if (customType) {
      return customType.dbToJs;
    }
    return null;
  }

  adjust(params) {
    const adjusted = {};
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined) {
        value = null;
      }
      if (value === null || typeof value === 'string' || typeof value === 'number' || value instanceof Buffer) {
        adjusted[`$${key}`] = value;
      }
      else {
        for (const customType of Object.values(this.customTypes)) {
          if (customType.valueTest && customType.valueTest(value)) {
            value = customType.jsToDb(value);
            break;
          }
        }
        adjusted[`$${key}`] = value;
      }
    }
    return adjusted;
  }

  process(result, options) {
    if (!options) {
      return result;
    }
    if (result.length === 0) {
      if (options.result === 'object' || options.result === 'value') {
        return undefined;
      }
      return result;
    }
    let mapper;
    if (options.result === 'object' || options.result === 'value') {
      mapper = mapOne;
    }
    else {
      mapper = mapMany;
    }
    if (options.result === 'value' || options.result === 'values') {
      if (options.parse) {
        const parsed = parse(result, options.types);
        const values = toValues(parsed);
        if (options.result === 'value') {
          return values[0];
        }
        return values;
      }
      const values = toValues(result);
      if (options.result === 'value') {
        return values[0];
      }
      return values;
    }
    if (options.parse && !options.map) {
      const parsed = parse(result, options.types);
      if (options.result === 'object') {
        return parsed[0];
      }
      return parsed;
    }
    if (options.map) {
      return mapper(this, result, options.columns, options.types);
    }
    return result;
  }

  async begin(tx) {
    await this.basicRun('begin', tx);
  }

  async commit(tx) {
    await this.basicRun('commit', tx);
  }

  async rollback(tx) {
    await this.basicRun('rollback', tx);
  }

  async basicRun() {
    return;
  }

  async basicAll() {
    return;
  }

  async prepare() {
    return;
  }

  async run() {
    return;
  }

  async all() {
    return;
  }

  async exec() {
    return;
  }
}

export default Database;
