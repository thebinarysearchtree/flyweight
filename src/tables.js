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
            const tableName = removeCapital(this.constructor.name);
            Table.requests.set(symbol, {
              category: 'DataType',
              tableName,
              type: dbType,
              notNull: true,
              ...props
            });
            return symbol;
          }
        });
      }
    }
    for (const category of ['Index', 'Unique', 'PrimaryKey']) {
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
            category: 'DataType',
            type,
            notNull: true,
            default: value
          });
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

const process = (Custom, tables) => {
  const instance = new Custom();
  const name = removeCapital(Custom.name);
  const table = {
    name,
    type: instance.Virtual ? 'virtual' : 'real',
    columns: [],
    indexes: [],
    primaryKeys: [],
    foreignKeys: [],
    checks: []
  };
  const columnSymbols = new Map();
  const literals = new Map();
  let keys;
  let target;
  if (table.type === 'virtual') {
    keys = Object.keys(instance.Virtual);
    target = instance.Virtual;
  }
  else {
    keys = Object
      .getOwnPropertyNames(instance)
      .filter(k => /[a-z]/.test(k.at(0)));
    target = instance;
  }
  for (const key of keys) {
    const value = target[key];
    const valueType = typeof value;
    if (valueType === 'symbol') {
      const request = Table.requests.get(value);
      const { category, tableName, ...column } = request;
      const data = {
        name: key,
        ...column
      };
      if (table.type === 'virtual') {
        data.original = {
          table: tableName,
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
      columnSymbols.set(value, data);
    }
    else {
      if (literals.has(value)) {
        throw Error('Cannot use the same default value more than once');
      }
      let type = valueType.toLowerCase();
      if (valueType === 'string') {
        type = 'text';
      }
      else if (valueType === 'number') {
        if (Number.isInteger(value)) {
          type = 'integer';
        }
        else {
          type = 'real';
        }
      }
      else if (value instanceof Date) {
        type = 'date';
      }
      else {
        throw Error('Unsupported default type');
      }
      const column = {
        name: key,
        type,
        notNull: true,
        default: value
      };
      literals.set(value, column);
      table.columns.push(column);
    }
  }
  const attributes = target.Attributes || {};
  const symbols = Object.getOwnPropertySymbols(attributes);
  for (const symbol of symbols) {
    const value = attributes[symbol];
    const keyRequest = Table.requests.get(symbol);
    const valueRequest = Table.requests.get(value);
    const column = columnSymbols.get(symbol);
    const valueTable = tables.find(t => t === value);
    if (column) {
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
        else if (category === 'DataType') {
          column.default = valueRequest.default;
        }
      }
      else if (valueTable) {
        column.references = valueTable.name;
      }
      else if (typeof value !== 'symbol') {
        if (Array.isArray(value)) {
          table.checks.push({
            column: column.name,
            allowed: value
          });
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
      if (category === 'Default') {
        const [columnSymbol, defaultValue] = value;
        const column = columnSymbols.get(columnSymbol) || literals.get(columnSymbol);
        column.default = defaultValue;
      }
      else if (category === 'Unique') {
        const values = Array.isArray(value) ? value : [value];
        const columns = values.map(v => columnSymbols.get(v).name);
        table.indexes.push({
          type: 'unique',
          columns
        });
      }
      else if (category === 'Index') {
        if (!Array.isArray(value) && typeof value !== 'symbol') {
          const symbol = Object.getOwnPropertySymbols(value).at(0);
          const column = columnSymbols.get(symbol).name;
          const literal = value[symbol];
          table.indexes.push({
            columns: [column],
            where: {
              [column]: literal
            }
          });
        }
        else {
          const values = Array.isArray(value) ? value : [value];
          const columns = values.map(v => columnSymbols.get(v).name);
          table.indexes.push({ columns });
        }
      }
      else if (category === 'PrimaryKey') {
        const values = Array.isArray(value) ? value : [value];
        const columns = values.map(v => columnSymbols.get(v).name);
        table.primaryKeys.push(...columns);
      }
    }
  }
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
    sql += `  ${column.name} ${dbType}${notNull}${defaultClause},\n`;
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
      const { column, allowed } = check;
      if (!column || !allowed || allowed.length === 0) {
        throw Error('Invalid check constraint');
      }
      const types = allowed.map(v => typeof v);
      const type = types.at(0);
      const unique = new Set(types);
      if (unique.size > 1) {
        throw Error('Invalid "in" constraint');
      }
      const items = allowed.map(value => {
        if (type === 'string') {
          return `'${sanitize(value)}'`;
        }
        return value;
      });
      sql += `  check (${column} in (${items.join(', ')})),\n`;
    }
  }
  if (sql.endsWith(',')) {
    sql = sql.slice(0, -1);
  }
  sql += ') strict;\n\n';
  for (const index of indexes) {
    const { type, columns, where } = index;
    columns.sort();
    const indexName = `${name}${type ? `_${type}` : ''}_index_${columns.join('_')}`;
    let indexSql = `create `;
    if (type === 'unique') {
      indexSql += 'unique ';
    }
    indexSql += `index ${indexName} on ${name} (${columns.join(', ')})`;
    if (where) {
      const statements = [];
      for (const [key, value] of Object.entries(where)) {
        statements.push(`${key} = ${toLiteral(value)}`);
      }
      indexSql += ` where ${statements.join(' and ')}`;
    }
    sql += ';\n';
    sql += indexSql;
  }
  return sql;
}

export {
  Table,
  process,
  toSql
}
