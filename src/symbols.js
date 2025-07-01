import { returnTypes, notNullFunctions } from './parsers/returnTypes.js';
import methods from './methods.js';

const operators = new Map([
  ['plus', '+'],
  ['minus', '-'],
  ['divide', '/'],
  ['multiply', '*']
]);

const processArg = (options) => {
  const {
    db,
    arg,
    columnRequests,
    computeRequests
  } = options;
  const subMethod = computeRequests.find(r => r.symbol === arg);
  if (subMethod) {
    return processMethod(subMethod);
  }
  const column = columnRequests.find(r => r === arg);
  if (column) {
    return verify(db, column).selector;
  }
  return toLiteral(db, arg);
}

const getObjectBody = (options) => {
  const {
    db,
    arg,
    columnRequests,
    computeRequests
  } = options;
  const items = [];
  for (const [key, value] of Object.entries(arg)) {
    items.push(`'${key}'`);
    if (typeof value === 'symbol') {
      const statement = processArg({
        db,
        arg: value,
        columnRequests,
        computeRequests
      });
      items.push(statement);
    }
    else {
      const statement = toLiteral(db, value);
      items.push(statement);
    }
  }
  return items.join(', ');
}

const processMethod = (options) => {
  const {
    db,
    method,
    columnRequests,
    computeRequests
  } = options;
  const statements = [];
  if (['jsonGroupArray', 'jsonObject'].includes(method.name)) {
    const arg = method.args.at(0);
    if (method.name === 'jsonGroupArray') {
      if (typeof arg === 'symbol') {
        const body = processArg({
          db,
          arg,
          columnRequests,
          computeRequests
        });
        return `json_group_array(${body})`;
      }
      else {
        const body = getObjectBody({
          db,
          arg,
          columnRequests,
          computeRequests
        });
        return `json_group_array(json_object(${body}))`;
      }
    }
    else {
      const body = getObjectBody({
        db,
        arg,
        columnRequests,
        computeRequests
      });
      return `json_object(${body})`;
    }
  }
  for (const arg of method.args) {
    const subMethod = computeRequests.find(r => r.symbol === arg);
    if (subMethod) {
      const statement = processMethod({
        db,
        method: subMethod,
        columnRequests,
        computeRequests
      });
      statements.push(statement);
      continue;
    }
    const column = columnRequests.find(r => r === arg);
    if (column) {
      const { selector } = verify(db, column);
      statements.push(selector);
    }
    else {
      const literal = toLiteral(db, arg);
      statements.push(literal);
    }
  }
  const operator = operators.get(method.name);
  if (operator) {
    return statements.join(` ${operator} `);
  }
  const name = method
    .name
    .replaceAll(/([A-Z])/gm, '_$1')
    .toLowerCase();
  return `${name}(${statements.join(', ')})`;
}

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
    return `'${value.toISOString()}'`;
  }
  else {
    throw Error('Invalid type in subquery');
  }
}

const toWhere = (options) => {
  const {
    db,
    where,
    type,
    columnRequests,
    compareRequests,
    computeRequests
  } = options;
  const statements = [];
  const whereKeys = Object.getOwnPropertySymbols(where);
  for (const symbol of whereKeys) {
    let selector;
    const computedKey = computeRequests.find(r => r.symbol === symbol);
    if (computedKey) {
      selector = processMethod({
        db,
        method: computedKey,
        columnRequests,
        computeRequests
      });
    }
    else {
      selector = verify(db, symbol).selector;
    }
    const value = where[symbol];
    const compareValue = compareRequests.find(r => r === value);
    const computeValue = computeRequests.find(r => r.symbol === value);
    if (compareValue) {
      const { method, param } = compareValue;
      if (method === 'not') {
        if (value === null) {
          statements.push(`${selector} is not null`);
        }
        else {
          statements.push(`${selector} != ${toLiteral(db, param)}`);
        }
      }
      else {
        const operator = methods.get(method);
        statements.push(`${selector} ${operator} ${toLiteral(db, param)}`);
      }
    }
    else if (computeValue) {
      const clause = processMethod({
        db,
        method: computeValue,
        columnRequests,
        compareRequests,
        computeRequests
      });
      statements.push(`${selector} = ${clause}`);
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
        .map(where => toWhere({ 
          db, 
          where, 
          type,
          columnRequests,
          compareRequests,
          computeRequests 
        }))
        .join(` ${type} `);
      statements.push(statement);
    }
  }
  return statements.join(` ${type} `);
}

const processQuery = (db, expression) => {
  let selectTable;
  const makeHandler = (table) => {
    selectTable = table;
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
    const proxy = new Proxy({}, handler);
    return proxy;
  }
  const columnRequests = [];
  const tableHandler = {
    get: function(target, property) {
      return makeHandler(property);
    }
  };
  const tableProxy = new Proxy({}, tableHandler);
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
  const computeHandler = {
    get: function(target, property) {
      const symbol = Symbol(property);
      const request = {
        name: property,
        args: null,
        symbol
      };
      computeRequests.push(request);
      return (...args) => {
        request.args = args;
        return symbol;
      };
    }
  }
  const computeProxy = new Proxy({}, computeHandler);
  const computeRequests = [];
  const result = expression(tableProxy, compareProxy, computeProxy);
  const { 
    select, 
    join, 
    leftJoin, 
    where,
    groupBy,
    having,
    orderBy,
    desc,
    offset, 
    limit, 
    as 
  } = result;
  const from = join || leftJoin;
  const joinClause = leftJoin ? 'left join' : 'join';
  const used = new Set();
  const adjustedFrom = [];
  let first;
  let symbols;
  if (from) {
    symbols = Object.getOwnPropertySymbols(from);
    for (const symbol of symbols) {
      adjustedFrom.push([verify(db, symbol), verify(db, from[symbol])]);
    }
    const [table] = adjustedFrom.at(0);
    first = table;
    used.add(first.table);
  }
  let sql = 'select ';
  const columns = [];
  const statements = [];
  db.columns[as] = {};
  for (const [key, value] of Object.entries(select)) {
    const computed = computeRequests.find(r => r.symbol === value);
    if (computed) {
      const selector = processMethod({
        db,
        method: computed,
        columnRequests,
        computeRequests
      });
      statements.push(`${selector} as ${key}`);
      const name = computed
        .name
        .replaceAll(/([A-Z])/gm, '_$1')
        .toLowerCase();
      if (computed.name === 'min' || computed.name === 'max') {
        const arg = computed.args.at(0);
        const request = columnRequests.find(r => r === arg);
        if (request) {
          const { table, column } = verify(db, request);
          const original = db.tables[table].find(c => c.name === column);
          db.columns[as][key] = original.type;
          if (original.type === 'json') {
            db.hasJson[as] = true;
          }
          columns.push({
            name: key,
            type: original.type,
            notNull: (original.primaryKey || original.notNull) && (!from || (!leftJoin || first.table === table))
          });
          continue;
        }
      }
      const type = returnTypes[name];
      db.columns[as][key] = type;
      if (type === 'json') {
        db.hasJson[as] = true;
      }
      const notNull = notNullFunctions.has(name);
      columns.push({
        name: key,
        type,
        notNull
      });
      continue;
    }
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
      notNull: (original.primaryKey || original.notNull) && (!from || (!leftJoin || first.table === table)) 
    });
  }
  sql += statements.join(', ');
  if (from) {
    sql += ` from ${first.table}`;
    for (const [l, r] of adjustedFrom) {
      const [join, other] = used.has(l.table) ? [r, l] : [l, r];
      used.add(join.table);
      sql += ` ${joinClause} ${join.table} on ${join.selector} = ${other.selector}`;
    }
  }
  else {
    sql += ` from ${selectTable}`;
  }
  if (where) {
    const clause = toWhere({
      db,
      where,
      type: 'and',
      columnRequests,
      compareRequests,
      computeRequests
    });
    if (clause) {
      sql += ` where ${clause}`;
    }
  }
  if (groupBy) {
    const adjusted = Array.isArray(groupBy) ? groupBy : [groupBy];
    const statements = adjusted.map(c => processArg({
      db,
      arg: c,
      columnRequests,
      computeRequests
    }));
    sql += ` group by ${statements.join(', ')}`;
  }
  if (having) {
    const clause = toWhere({
      db,
      where: having,
      type: 'and',
      columnRequests,
      compareRequests,
      computeRequests
    });
    if (clause) {
      sql += ` having ${clause}`;
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
  processQuery
}
