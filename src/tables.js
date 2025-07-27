import { compareMethods, computeMethods } from './methods.js';
import { processArg, processMethod, toWhere } from './requests.js';

const types = ['Int', 'Real', 'Text', 'Blob', 'Json', 'Date', 'Bool'];
const modifiers = [
  ['', {}],
  ['p', { primaryKey: true }],
  ['x', { notNull: false }]
];

const removeCapital = (name) => {
  return name.at(0).toLowerCase() + name.substring(1);
}

const addCapital = (name) => {
  return name.at(0).toUpperCase() + name.substring(1);
}

const sanitize = (s) => s.replaceAll(/'/gmi, '\'\'');

const toColumn = (instance, literal) => {
  const type = typeof literal;
  let column;
  if (type === 'string') {
    column = instance.Text;
  }
  else if (type === 'number') {
    if (Number.isInteger(literal)) {
      column = instance.Int;
    }
    else {
      column = instance.Real;
    }
  }
  else if (type === 'boolean') {
    column = instance.Bool;
  }
  else if (symbol instanceof Date) {
    column = instance.Date;
  }
  else {
    throw Error(`Invalid default value ${literal}`);
  }
  const request = Table.requests.get(column);
  request.default = literal;
  return column;
}

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
  }

  get Now() {
    const symbol = Symbol();
    Table.requests.set(symbol, {
      category: 'Column',
      type: 'date',
      notNull: true,
      default: 'now'
    });
    return symbol;
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

  Index(column, expression) {
    const symbol = Symbol();
    Table.requests.set(symbol, {
      category: 'Index',
      column,
      expression
    });
    return symbol;
  }

  Unique(...columns) {
    const symbol = Symbol();
    Table.requests.set(symbol, {
      category: 'Unique',
      columns
    });
    return symbol;
  }

  Check(column, expression) {
    const symbol = Symbol();
    Table.requests.set(symbol, {
      category: 'Check',
      column,
      expression
    });
    return symbol;
  }

  Cascade(instance, options) {
    options = options || {};
    options.onDelete = 'cascade';
    return this.References(instance, options);
  }

  References(instance, options) {
    const { 
      column,
      onDelete,
      onUpdate,
      notNull,
      index
    } = options;
    const request = {
      category: 'ForeignKey',
      column: null,
      references: removeCapital(instance.name),
      actions: [],
      index: index === false ? false : true
    };
    const columns = getColumns(instance)
      .filter(c => column ? c.name === column : c.primaryKey);
    if (columns.length !== 1) {
      throw Error('The foreign key options are not valid');
    }
    const target = columns.at(0);
    target.primaryKey = false;
    target.notNull = notNull === false ? false : true;
    request.column = target;
    if (onDelete) {
      request.actions.push(`on delete ${onDelete}`);
    }
    if (onUpdate) {
      request.actions.push(`on update ${onUpdate}`);
    }
    const symbol = Symbol();
    Table.requests.set(request);
    return symbol;
  }
}

const getKeys = (instance) => {
  return Object
    .getOwnPropertyNames(instance)
    .filter(k => /[a-z]/.test(k.at(0)));
}

const getColumns = (constructor) => {
  const instance = new constructor();
  const keys = getKeys(instance);
  return keys.map(key => {
    const value = instance[key];
    let request;
    if (typeof value === 'symbol') {
      request = Table.requests.get(value);
    }
    else {
      request = toColumn(instance, value);
    }
    const clone = structuredClone(request);
    clone.name = key;
    return clone;
  });
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
    if (valueType !== 'symbol') {
      instance[key] = toColumn(instance, symbol);
      symbol = instance[key];
    }
    const request = Table.requests.get(symbol);
    const { category, ...column } = request;
    if (category === 'ForeignKey') {
      const { 
        references,
        actions,
        index
      } = request;
      const column = structuredClone(request.column);
      column.name = key;
      table.columns.push(column);
      table.foreignKeys.push({
        columns: [key],
        references: {
          table: references,
          column: request.column.name
        },
        actions
      });
      Table.requests.set(symbol, column);
      if (index !== false) {
        table.indexes.push({ on: key });
      }
      continue;
    }
    else if (category === 'Check') {
      const column = Table.requests.get(request.column);
      column.name = key;
      table.columns.push(column);
      Table.requests.set(symbol, column);
      const check = request.expression;
      if (typeof check === 'symbol') {
        const method = Table.requests.get(check);
        if (method.category === 'Column') {
          table.checks.push(`${key} = ${method.name}`);
        }
        else {
          const result = processMethod({
            method,
            requests: Table.requests
          });
          table.checks.push(`${key} ${result.sql}`);
        }
      }
      else if (Array.isArray(check)) {
        const clause = check.map(s => toLiteral(s)).join(', ');
        table.checks.push(`${key} in (${clause})`);
      }
      else {
        table.checks.push(`${key} = ${toLiteral(check)}`);
      }
      continue;
    }
    else if (['Index', 'Unique'].includes(category)) {
      const type = category === 'Unique' ? 'unique' : undefined;
      const column = Table.requests.get(request.column);
      column.name = key;
      table.columns.push(column);
      Table.requests.set(symbol, column);
      let where;
      if (request.expression) {
        const result = request.expression(symbol);
        const { sql } = toWhere({
          where: result,
          requests: Table.requests
        });
        where = sql;
      }
      table.indexes.push({
        type,
        on: [key],
        where
      });
      continue;
    }
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
          processForeignKey(column.name, valueRequest);
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
          },
          actions: []
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
        actions
      } = foreignKey;
      const actionClause = actions.length > 0 ? ` ${actions.join(' ')}` : '';
      sql += `  foreign key (${columns.join(', ')}) references ${references.table}(${references.column})${actionClause},\n`;
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
