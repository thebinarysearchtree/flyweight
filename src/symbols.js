import methods from './methods.js';

const verify = (db, symbol) => {
  const [table, column] = symbol.description.split('.');
  const selector = `${table}.${column}`;
  if (!db.tables[table] || !db.columns[table][column]) {
    throw Error(`Table or column from ${selector} does not exist`);
  }
  return {
    table,
    column,
    selector
  }
}

const toLiteral = (db, value) => {
  const valueType = typeof value;
  if (valueType === 'symbol') {
    return verify(db, value).selector;
  }
  else if (valueType === 'boolean') {
    return value === true ? 1 : 0;
  }
  else if (valueType === 'number') {
    return value;
  }
  else if (value instanceof Date) {
    return value.toISOString();
  }
  else {
    throw Error('Invalid type in where clause');
  }
}

const toWhere = (options) => {
  const {
    db,
    where,
    type,
    compareRequests
  } = options;
  const statements = [];
  const whereKeys = Object.getOwnPropertySymbols(where);
  for (const symbol of whereKeys) {
    const value = where[symbol];
    const { selector } = verify(db, symbol);
    const request = compareRequests.find(r => r === value);
    if (request) {
      if (request.method === 'not') {
        if (value === null) {
          statements.push(`${selector} is not null`);
        }
        else {
          statements.push(`${selector} != ${toLiteral(db, request.param)}`);
        }
      }
      else {
        const operator = methods.get(request.method);
        statements.push(`${selector} ${operator} ${toLiteral(db, request.param)}`);
      }
    }
    else if (value === null) {
      statements.push(`${selector} is null`);
    }
    else {
      statements.push(`${selector} = ${toLiteral(db, value)}`);
    }
  }
  for (const type of ['and', 'or']) {
    const value = where[type];
    if (value) {
      if (!Array.isArray(value)) {
        throw Error(`Invalid arguments to "${type}" in the where clause`);
      }
      const statement = value
        .map(where => toWhere({ db, where, type }))
        .join(` ${type} `);
      statements.push(statement);
    }
  }
  return statements.join(` ${type} `);
}

const processView = (db, expression) => {
  const makeHandler = (table) => {
    const keys = Object.keys(db.columns[table]);
    const handler = {
      get: function(target, property) {
        const symbol = Symbol(`${table}.${property}`);
        columnRequests.push(symbol);
        return symbol;
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
  const compareRequests = [];
  const compareHandler = {
    get: function(target, property) {
      const request = {
        method: property,
        param: null
      };
      compareRequests.push(request);
      return (param) => {
        request.param = param;
        return request;
      }
    }
  }
  const compareProxy = new Proxy({}, compareHandler);
  const result = expression(proxy, compareProxy);
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
  const symbols = Object.getOwnPropertySymbols(from);
  const adjustedFrom = [];
  for (const symbol of symbols) {
    adjustedFrom.push([verify(db, symbol), verify(db, from[symbol])]);
  }
  const [first] = adjustedFrom.at(0);
  used.add(first.table);
  let sql = 'select ';
  const columns = [];
  const statements = [];
  db.columns[as] = {};
  for (const [key, value] of Object.entries(select)) {
    const symbol = columnRequests.find(r => r === value);
    const { table, column, selector } = verify(db, symbol);
    statements.push(`${selector} as ${key}`);
    const original = db.tables[table].find(c => c.name === column);
    db.columns[as][key] = original.type;
    if (original.type === 'json') {
      db.hasJson[as] = true;
    }
    columns.push({
      name: key,
      type: original.type,
      notNull: (original.primaryKey || original.notNull) && (!leftJoin || first.table === table) 
    });
  }
  sql += statements.join(', ');
  sql += ` from ${first.table}`;
  for (const [l, r] of adjustedFrom) {
    const [join, other] = used.has(l.table) ? [r, l] : [l, r];
    used.add(join.table);
    sql += ` ${joinClause} ${join.table} on ${join.selector} = ${other.selector}`;
  }
  if (where) {
    const clause = toWhere({
      db,
      where,
      compareRequests
    });
    if (clause) {
      sql += ` where ${clause}`;
    }
  }
  if (orderBy) {
    if (typeof orderBy === 'symbol') {
      const { selector } = verify(db, orderBy);
      sql += ` order by ${selector}`;
    }
    else if (Array.isArray(orderBy)) {
      const selectors = orderBy
        .map(c => verify(db, c).selector)
        .join(', ');
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
  return {
    columns,
    sql,
    as
  }
}

export {
  processView
}
