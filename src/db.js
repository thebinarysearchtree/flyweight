import { toValues, expressionHandler } from './utils.js';
import { parse } from './parsers.js';
import { mapOne, mapMany } from './map.js';
import { getTables, getViews, getVirtual } from './parsers/tables.js';
import { getFragments } from './parsers/tables.js';
import { blank } from './parsers/utils.js';
import { preprocess } from './parsers/preprocessor.js';
import { createTypes } from './parsers/types.js';
import { migrate } from './migrations.js';
import { makeClient } from './proxy.js';
import { tsReturnTypes } from './parsers/returnTypes.js';

const dbTypes = {
  integer: true,
  int: true,
  real: true,
  text: true,
  blob: true,
  any: true
}

const typeMap = {
  integer: 'number',
  real: 'number',
  text: 'string',
  blob: 'Buffer',
  any: 'number | string | Buffer'
}

class Database {
  constructor(props) {
    this.paths = props.paths;
    this.adaptor = props.adaptor;
    this.name = props.name;
    this.read = null;
    this.write = null;
    this.transact = null;
    this.tables = {};
    this.mappers = {};
    this.customTypes = {};
    this.columns = {};
    this.hasJson = {};
    this.computed = new Map();
    this.computedTypes = new Map();
    this.subQueries = new Map();
    this.statements = new Map();
    this.viewSet = new Set();
    this.virtualSet = new Set();
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
        tsType: 'Json',
        dbType: 'blob'
      }
    ]);
  }

  async makeTypes(fileSystem, paths, sampleData) {
    if (!this.initialized) {
      await this.initialize();
    }
    await createTypes({
      db: this,
      sqlDir: paths.sql,
      destinationPath: paths.types,
      computedPath: paths.computed,
      customPath: paths.custom,
      jsonPath: paths.json,
      fileSystem,
      sampleData
    });
  }

  getClient() {
    return makeClient(this);
  }

  async view(expression) {
    if (!this.initialized) {
      await this.initialize();
    }
    const makeHandler = (table) => {
      const keys = Object.keys(this.columns[table]);
      const handler = {
        get: function(target, property) {
          const request = {
            column: property,
            table,
            toString: () => `${table}.${property}`
          };
          columnRequests.push(request);
          return request;
        },
        ownKeys: function(target) {
          return keys;
        },
        getOwnPropertyDescriptor: function(target, property) {
          if (keys.includes(property)) {
            return {
              enumerable: true,
              configurable: true
            };
          }
          return undefined;
        }
      };
      const target = {};
      const proxy = new Proxy(target, handler);
      return proxy;
    }
    const columnRequests = [];
    const handler = {
      get: function(target, property) {
        return makeHandler(property);
      }
    };
    const target = {};
    const proxy = new Proxy(target, handler);
    const result = expression(proxy);
    const { 
      select, 
      join, 
      leftJoin, 
      where, 
      orderBy,
      desc,
      offset, 
      limit, 
      as 
    } = result;
    const from = join || leftJoin;
    const joinClause = leftJoin ? 'left join' : 'join';
    const used = new Set();
    const [first] = from.at(0);
    used.add(first.table);
    const verify = (key) => {
      let table;
      let column;
      if (typeof key === 'string') {
        const [t, c] = key.split('.');
        table = t;
        column = c;
      }
      else {
        table = key.table;
        column = key.column;
      }
      if (!this.tables[table] || !this.columns[table][column]) {
        throw Error(`Table or column from ${key} does not exist`);
      }
      return `${table}.${column}`;
    }
    let sql = 'select ';
    const columns = [];
    const statements = [];
    this.columns[as] = {};
    for (const [key, value] of Object.entries(select)) {
      const { table, column } = columnRequests.find(r => r === value);
      statements.push(`${table}.${column} as ${key}`);
      const original = this.tables[table].find(c => c.name === column);
      this.columns[as][key] = original.type;
      if (column.type === 'json') {
        this.hasJson[as] = true;
      }
      columns.push({
        name: key,
        type: original.type,
        notNull: original.notNull && (!leftJoin || first.table === table) 
      });
    }
    sql += statements.join(', ');
    sql += ` from ${first.table}`;
    for (const [l, r] of from) {
      const [join, other] = used.has(l.table) ? [r, l] : [l, r];
      const joinSelector = verify(join);
      const otherSelector = verify(other);
      used.add(join.table);
      sql += ` ${joinClause} ${join.table} on ${joinSelector} = ${otherSelector}`;
    }
    if (where) {
      const statements = [];
      for (const [key, value] of Object.entries(where)) {
        const selector = verify(key);
        if (value === null) {
          statements.push(`${selector} is null`);
        }
        else if (typeof value === 'boolean') {
          const literal = value === true ? 1 : 0;
          statements.push(`${selector} = ${literal}`);
        }
        else if (typeof value === 'number') {
          statements.push(`${selector} = ${value}`);
        }
        else {
          throw Error(`Invalid value for ${key}`);
        }
      }
      if (statements.length > 0) {
        sql += ` where ${statements.join(' and ')}`;
      }
    }
    if (orderBy) {
      if (typeof orderBy === 'string') {
        const selector = verify(orderBy);
        sql += ` order by ${selector}`;
      }
      else if (Array.isArray(orderBy)) {
        const selectors = orderBy.map(c => verify(c)).join(', ');
        sql += ` order by ${selectors}`;
      }
      else {
        throw Error(`Invalid orderBy`);
      }
      if (desc) {
        sql += ' desc';
      }
    }
    if (offset) {
      if (typeof offset !== 'number' || !Number.isInteger(offset)) {
        throw Error('Invalid offset');
      }
      sql += ` offset ${offset}`;
    }
    if (limit) {
      if (typeof limit !== 'number' || !Number.isInteger(limit)) {
        throw Error('Invalid offset');
      }
      sql += ` limit ${limit}`;
    }
    this.subQueries.set(as, sql);
    this.tables[as] = columns;
  }

  compute(table, properties) {
    const map = new Map();
    this.computed.set(table, map);
    for (const [name, expression] of Object.entries(properties)) {
      const {
        operators,
        columnRequests,
        methodRequests,
        createClause 
      } = expressionHandler(expression);
      const method = methodRequests.at(0);
      let tsType;
      let columnType;
      if (method) {
        if (operators.has(method.name)) {
          tsType = 'number | null';
        }
        else {
          tsType = tsReturnTypes[method.name];
        }
      }
      else {
        const request = columnRequests.at(0);
        if (request.path.length === 0) {
          columnType = this.columns[table][request.name];
          tsType = typeMap[columnType];
        }
        else {
          tsType = 'number | string | null';
        }
      }
      let jsonPath;
      if (!method) {
        const request = columnRequests.at(0);
        if (request.path.length > 0) {
          jsonPath = {
            key: `${table} ${request.name}`,
            path: request.path
          };
        }
      }
      else if (method.name === 'json_extract') {
        const column = method.args.at(0);
        const path = method.args.at(1);
        if (!path.includes('[')) {
          const request = columnRequests.find(r => r.proxy === column);
          const split = path.substring(2).split('.');
          jsonPath = {
            key: `${table} ${request.name}`,
            path: split
          };
        }
      }
      const item = {
        createClause,
        columnType,
        tsType,
        jsonPath
      };
      map.set(name, item);
    }
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

  async readComputed() {
    return;
  }

  async createMigration(fileSystem, paths, name, reset) {
    if (!this.initialized) {
      await this.initialize();
    }
    const sql = await migrate(fileSystem, paths, this, name, reset);
    return sql.trim();
  }

  async initialize() {
    return;
  }

  async runMigration() {
    return;
  }

  async createDatabase() {
    return;
  }

  addTables(tables) {
    for (const table of tables) {
      this.tables[table.name] = table.columns;
      this.columns[table.name] = {};
      this.hasJson[table.name] = false;
      for (const column of table.columns) {
        this.columns[table.name][column.name] = column.type;
        if (column.type === 'json') {
          this.hasJson[table.name] = true;
        }
      }
    }
  }

  async setTables() {
    let sql = '';
    try {
      sql = await this.readTables();
    }
    catch {
      return;
    }
    if (!sql.trim()) {
      return;
    }
    const tables = getTables(sql);
    this.addTables(tables);
  }

  async setViews() {
    let sql = '';
    try {
      sql = await this.readViews();
    }
    catch {
      return;
    }
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

  async setComputed() {
    try {
      const file = await this.readComputed();
      const parsed = JSON.parse(file);
      this.computedTypes = new Map(parsed);
    }
    catch {
      this.computedTypes = new Map();
    }
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

  getComputedParser(table, column) {
    const computed = this.computed.get(table);
    if (computed) {
      const item = computed.get(column);
      if (item) {
        if (item.columnType && !dbTypes[item.columnType]) {
          return this.customTypes[item.columnType].dbToJs;
        }
        const computedType = this.computedTypes.get(`${table} ${column}`);
        if (computedType) {
          return this.customTypes[computedType].dbToJs;
        }
      }
    }
  }

  needsParsing(table, keys) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    for (const key of keys) {
      if (this.getComputedParser(table, key)) {
        return true;
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

  convertToJs(table, column, value, customFields) {
    if (value === null) {
      return value;
    }
    const parser = this.getComputedParser(table, column);
    if (parser) {
      return parser(value);
    }
    const computed = this.computed.get(table);
    if (computed && computed.has(column)) {
      return value;
    }
    let type;
    if (customFields && customFields[column]) {
      type = customFields[column];
    }
    else {
      type = this.columns[table][column];
    }
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
      if (value === null || typeof value === 'string' || typeof value === 'number' || (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))) {
        adjusted[key] = value;
      }
      else {
        for (const customType of Object.values(this.customTypes)) {
          if (customType.valueTest && customType.valueTest(value)) {
            value = customType.jsToDb(value);
            break;
          }
        }
        adjusted[key] = value;
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

  async close() {
    return;
  }
}

export default Database;
