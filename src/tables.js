import { compareMethods, computeMethods } from './methods.js';
import { processArg, processMethod, toWhere } from './requests.js';

const types = ['Int', 'Real', 'Text', 'Blob', 'Json', 'Date', 'Bool'];
const modifiers = [
  ['', {}],
  ['p', { primaryKey: true }],
  ['x', { notNull: false }],
  ['u', { unique: true }]
];

const removeCapital = (name) => {
  return name.at(0).toLowerCase() + name.substring(1);
}

const addCapital = (name) => {
  return name.at(0).toUpperCase() + name.substring(1);
}

const sanitize = (s) => s.replaceAll(/'/gmi, '\'\'');

const toLiteral = (value) => {
  const type = typeof value;
  if (type === 'string') {
    return `'${sanitize(value)}'`;
  }
  if (type === 'boolean') {
    return value === true ? 1 : 0;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

class Table {
  static requests = new Map();

  constructor() {
    const methods = [...compareMethods, ...computeMethods];
    for (const method of methods) {
      let name = addCapital(method);
      if (['Date', 'Json'].includes(name)) {
        name = `To${name}`;
      }
      const type = compareMethods.includes(method) ? 'Compare' : 'Compute';
      Object.defineProperty(this, name, {
        get: function() {
          const symbol = Symbol();
          const request = {
            category: 'Method',
            type,
            name: method,
            args: null
          };
          Table.requests.set(symbol, request);
          return (...args) => {
            request.args = args;
            return symbol;
          }
        }
      });
    }
    for (const type of types) {
      for (const modifier of modifiers) {
        const [word, props] = modifier;
        let dbType = type.toLowerCase();
        if (dbType === 'bool') {
          dbType = 'boolean';
        }
        else if (dbType === 'int') {
          dbType = 'integer';
        }
        const key = `${type}${word}`;
        Object.defineProperty(this, key, {
          get: function() {
            const symbol = Symbol();
            Table.requests.set(symbol, {
              category: 'Column',
              type: dbType,
              notNull: true,
              ...props
            });
            return symbol;
          }
        });
      }
    }
    for (const category of ['Index', 'Unique', 'PrimaryKey', 'Check']) {
      Object.defineProperty(this, category, {
        get: function() {
          const symbol = Symbol();
          Table.requests.set(symbol, {
            category
          });
          return symbol;
        }
      });
    }
    const defaults = [
      ['date', 'Now', 'now'],
      ['boolean', 'True', true],
      ['boolean', 'False', false]
    ];
    for (const item of defaults) {
      const [type, key, value] = item;
      Object.defineProperty(this, key, {
        get: function() {
          const symbol = Symbol();
          Table.requests.set(symbol, {
            category: 'Column',
            type,
            notNull: true,
            default: value
          });
          return symbol;
        }
      });
    }
  }

  ReplaceFields() {
    const keys = Object.getOwnPropertyNames(this).filter(k => /^[a-z]/.test(k));
    for (const key of keys) {
      const symbol = this[key];
      const request = Table.requests.get(symbol);
      Object.defineProperty(this, key, {
        get: function() {
          const symbol = Symbol();
          Table.requests.set(symbol, request);
          return symbol;
        }
      });
    }
  }
}

for (const type of ['Delete', 'Update']) {
  for (const action of ['NoAction', 'Restrict', 'SetNull', 'SetDefault', 'Cascade']) {
    const key = `On${type}${action}`;
    const adjustedAction = key
      .replaceAll(/([a-z])([A-Z])/gm, '$1 $2')
      .toLowerCase();
    Object.defineProperty(Table, key, {
      get: function() {
        const symbol = Symbol();
        Table.requests.set(symbol, {
          category: 'ForeignKey',
          table: removeCapital(this.name),
          action: adjustedAction
        });
        return symbol;
      }
    });
  }
}

const getKeys = (instance) => {
  return Object
    .getOwnPropertyNames(instance)
    .filter(k => /[a-z]/.test(k.at(0)));
}

const process = (Custom, tables) => {
  const instance = new Custom();
  const name = removeCapital(Custom.name);
  const table = {
    name,
    type: instance.Virtual ? 'virtual' : 'real',
    columns: [],
    computed: [],
    indexes: [],
    primaryKeys: [],
    foreignKeys: [],
    checks: []
  };
  const keys = getKeys(instance);
  const virtualColumns = new Map();
  let virtualTable;
  if (table.type === 'virtual') {
    const parent = instance.Virtual;
    virtualTable = removeCapital(parent.constructor.name);
    const keys = getKeys(parent);
    const mapped = keys
      .map(key => {
        const symbol = parent[key];
        const request = Table.requests.get(symbol);
        const column = { name: key, ...request };
        return {
          key,
          column
        }
      });
    for (const item of mapped) {
      virtualColumns.set(item.key, item.column);
    }
    const primaryKey = mapped.find(m => m.column.primaryKey);
    table.columns.push({
      name: 'rowId',
      type: primaryKey.column.type,
      original: {
        table: virtualTable,
        name: primaryKey.name
      }
    });
  }
  for (const key of keys) {
    let symbol = instance[key];
    const valueType = typeof symbol;
    const references = tables.find(t => t === symbol);
    if (references) {
      const name = removeCapital(references.name);
      const other = new references();
      const keys = getKeys(other);
      const primaryKeys = keys
        .map(key => Table.requests.get(other[key]))
        .filter(r => r.primaryKey);
      if (primaryKeys.length !== 1) {
        throw Error('Cannot find an appropriate primary key from the referenced table');
      }
      const primaryKey = primaryKeys.at(0);
      const request = { ...primaryKey };
      request.primaryKey = false;
      const updated = Symbol();
      Table.requests.set(updated, request);
      instance[key] = updated;
      symbol = updated;
      table.foreignKeys.push({
        columns: [key],
        references: {
          table: name
        }
      });
    }
    if (valueType !== 'symbol' && !references) {
      if (valueType === 'string') {
        instance[key] = instance.Text;
      }
      else if (valueType === 'number') {
        if (Number.isInteger(symbol)) {
          instance[key] = instance.Int;
        }
        else {
          instance[key] = instance.Real;
        }
      }
      else if (valueType === 'boolean') {
        instance[key] = instance.Bool;
      }
      else if (symbol instanceof Date) {
        instance[key] = instance.Date;
      }
      else {
        throw Error(`The default value for "${key}" is invalid`);
      }
      const request = Table.requests.get(instance[key]);
      request.default = symbol;
      symbol = instance[key];
    }
    const request = Table.requests.get(symbol);
    const { category, ...column } = request;
    if (category === 'Method') {
      const { type, sql } = processMethod({
        method: request,
        requests: Table.requests
      });
      const data = {
        category: 'Column',
        name: key,
        type,
        sql
      };
      table.computed.push(data);
      Table.requests.set(symbol, data);
      continue;
    }
    const data = {
      category: 'Column',
      name: key,
      ...column
    };
    if (table.type === 'virtual') {
      const column = virtualColumns.get(key);
      data.original = {
        table: virtualTable,
        name: column.name
      }
    }
    else {
      request.name = key;
    }
    if (request.primaryKey) {
      table.primaryKeys.push(key);
    }
    table.columns.push(data);
    Table.requests.set(symbol, data);
  }
  let attributes = {};
  if (instance.Attributes) {
    instance.ReplaceFields();
    attributes = instance.Attributes();
  }
  const symbols = Object.getOwnPropertySymbols(attributes);
  for (const symbol of symbols) {
    const value = attributes[symbol];
    const keyRequest = Table.requests.get(symbol);
    const valueRequest = Table.requests.get(value);
    const valueTable = tables.find(t => t === value);
    if (keyRequest.category === 'Column') {
      const column = keyRequest;
      if (valueRequest) {
        const category = valueRequest.category;
        if (category === 'ForeignKey') {
          table.foreignKeys.push({
            columns: [column.name],
            references: {
              table: valueRequest.table
            },
            action: valueRequest.action
          });
        }
        else if (category === 'Column') {
          column.default = valueRequest.default;
        }
        else if (category === 'Method') {
          const result = processMethod({
            method: valueRequest,
            requests: Table.requests
          });
          if (valueRequest.type === 'Compare') {
            table.checks.push(`${keyRequest.name} ${result.sql}`);
          }
          else {
            column.default = result.sql;
          }
        }
      }
      else if (valueTable) {
        const tableName = removeCapital(valueTable.name);
        table.foreignKeys.push({
          columns: [column.name],
          references: {
            table: tableName
          }
        });
      }
      else if (typeof value !== 'symbol') {
        if (Array.isArray(value)) {
          const sql = `${column.name} in (${value.map(v => toLiteral(v)).join(', ')})`;
          table.checks.push(sql);
        }
        else {
          if (typeof value === 'string') {
            column.default = sanitize(value);
          }
          else {
            column.default = value;
          }
        }
      }
    }
    else if (keyRequest) {
      const category = keyRequest.category;
      if (category === 'Check') {
        const sql = toWhere({
          where: value,
          requests: Table.requests
        });
        table.checks.push(sql);
      }
      else if (['Unique', 'Index'].includes(category)) {
        let on;
        let where;
        const type = category === 'Unique' ? 'unique' : undefined;
        if (!Array.isArray(value) && typeof value !== 'symbol') {
          on = Array.isArray(value.on) ? value.on : [value.on];
          where = value.where;
        }
        else if (Array.isArray(value)) {
          on = value;
        }
        else {
          on = [value];
        }
        const args = on.map(arg => processArg({
          arg,
          requests: Table.requests
        }));
        const whereSql = where ? toWhere({
          where,
          requests: Table.requests
        }) : undefined;
        const index = {};
        if (type) {
          index.type = type;
        }
        const mapped = args.map(r => r.sql);
        mapped.sort();
        index.on = mapped.join(', ');
        if (whereSql) {
          index.where = whereSql;
        }
        table.indexes.push(index);
      }
      else if (category === 'PrimaryKey') {
        const values = Array.isArray(value) ? value : [value];
        const columns = values.map(v => Table.requests.get(v).name);
        table.primaryKeys.push(...columns);
      }
    }
  }
  table.columns = table.columns.map(column => {
    const { category, ...rest } = column;
    return rest;
  });
  return table;
}

const typeMap = {
  date: 'text',
  boolean: 'integer',
  json: 'blob'
};

const toVirtual = (table) => {
  const { 
    name,
    columns
  } = table;
  let sql = `create virtual table ${name} using fts5 (\n`;
  let rowId;
  let originalTable;
  const names = [];
  for (const column of columns) {
    if (column.name === 'rowId') {
      rowId = column.original.name;
      originalTable = column.original.table;
    }
    else {
      names.push(column.name);
      sql += `  ${column.name},\n`;
    }
  }
  sql += `  content=${originalTable},\n`;
  sql += `  content_rowid=${rowId}\n`;
  sql += `);\n`;
  sql += `
    create trigger ${name}_ai after insert on ${originalTable} begin
      insert into ${name}(rowid, ${names.join(',')}) values (new.rowid, ${names.map(n => `new.${n}`).join(', ')});
    end;

    create trigger ${name}_ad after delete on ${originalTable} begin
        insert into ${name}(${name}, rowid, ${names.join(', ')}) values ('delete', old.rowid, ${names.map(n => `old.${n}`).join(', ')});
    end;

    create trigger ${name}_au after update on ${originalTable} begin
        insert into ${name}(${name}, rowid, ${names.join(', ')}) values ('delete', old.rowid, ${names.map(n => `old.${n}`).join(', ')});
        insert into ${name}(rowid, ${names.join(', ')}) values (new.rowid, ${names.map(n => `new.${n}`).join(', ')});
    end;`;
  return sql;
}

const columnToSql = (column) => {
  const dbType = typeMap[column.type] || column.type;
  const notNull = column.notNull ? ' not null' : '';
  let defaultClause = '';
  if (column.default !== undefined) {
    if (column.type === 'date' && column.default === 'now') {
      defaultClause = ` default (date() || 'T' || time() || '.000Z')`;
    }
    else {
      defaultClause = ` default ${toLiteral(column.default)}`;
    }
  }
  return `${column.name} ${dbType}${notNull}${defaultClause}`;
}

const toHash = (index) => {
  const replacers = [
    [/([a-z])([A-Z])/gm, '$1_$2'],
    [/\s+/gm, '_'],
    ['<=', 'lte'],
    ['>=', 'gte'],
    ['=', 'eq'],
    ['>', 'gt'],
    ['<', 'lte'],
    [/[^a-z_0-9]/gmi, '']
  ];
  let hash = Object.values(index).join('_');
  for (const replacer of replacers) {
    const [from, to] = replacer;
    hash = hash.replaceAll(from, to);
  }
  return hash.toLowerCase();
}

const indexToSql = (table, index) => {
  const { type, on, where } = index;
  const hash = toHash(index);
  const indexName = `${table}_${hash}`;
  let sql = `create `;
  if (type === 'unique') {
    sql += 'unique ';
  }
  sql += `index ${indexName} on ${table}(${on})`;
  if (where) {
    sql += ` where ${where}`;
  }
  sql += ';\n';
  return sql;
}

const toSql = (table) => {
  const { 
    name,
    columns,
    indexes,
    primaryKeys,
    foreignKeys,
    checks
  } = table;
  if (table.type === 'virtual') {
    return toVirtual(table);
  }
  let sql = `create table ${name} (\n`;
  for (const column of columns) {
    const clause = columnToSql(column);
    sql += `  ${clause},\n`;
  }
  if (primaryKeys.length > 0) {
    sql += `  primary key (${primaryKeys.join(', ')}),\n`;
  }
  if (foreignKeys.length > 0) {
    for (const foreignKey of foreignKeys) {
      const {
        columns,
        references,
        action
      } = foreignKey;
      const actionClause = action ? ` ${action}` : '';
      sql += `  foreign key (${columns.join(', ')}) references ${references.table}${actionClause},\n`;
    }
  }
  if (checks.length > 0) {
    for (const check of checks) {
      sql += `  check (${check}),\n`;
    }
  }
  if (sql.endsWith(',')) {
    sql = sql.slice(0, -1);
  }
  sql += ') strict;\n\n';
  for (const index of indexes) {
    sql += indexToSql(name, index);
  }
  return sql;
}

export {
  Table,
  process,
  toSql,
  toHash,
  indexToSql,
  columnToSql,
  removeCapital
}
