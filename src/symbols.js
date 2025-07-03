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
    requests
  } = options;
  const subMethod = requests.compute.find(r => r.symbol === arg);
  if (subMethod) {
    return processMethod(subMethod);
  }
  const column = requests.column.find(r => r === arg);
  if (column) {
    return verify(db, column).selector;
  }
  return toLiteral(db, arg);
}

const getObjectBody = (options) => {
  const {
    db,
    arg,
    requests
  } = options;
  const items = [];
  for (const [key, value] of Object.entries(arg)) {
    items.push(`'${key}'`);
    if (typeof value === 'symbol') {
      const statement = processArg({
        db,
        arg: value,
        requests
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

const processWindow = (options) => {
  const {
    db,
    query,
    requests
  } = options;
  let sql = '';
  const { 
    where, 
    partitionBy, 
    orderBy, 
    desc, 
    frame 
  } = query;
  if (where) {
    const clause = toWhere({
      db,
      where,
      requests
    });
    sql += `filter (where ${clause})`;
  }
  if (partitionBy || orderBy) {
    let clause = '';
    if (partitionBy) {
      const items = Array.isArray(partitionBy) ? partitionBy : [partitionBy];
      const statements = items.map(arg => processArg({
        db,
        arg,
        requests
      }));
      clause += ` partition by ${statements.join(', ')}`;
    }
    if (orderBy) {
      const items = Array.isArray(orderBy) ? orderBy : [orderBy];
      const statements = items.map(arg => processArg({
        db,
        arg,
        requests
      }));
      clause += ` order by ${statements.join(', ')}${desc ? ' desc' : ''}`;
    }
    if (frame) {
      const {
        type,
        currentRow,
        preceding,
        following
      } = frame;
      clause += ` ${type} between `;
      if (currentRow) {
        clause += 'current row and ';
      }
      if (preceding !== undefined) {
        if (preceding === 'unbounded') {
          clause += 'unbounded preceding and ';
        }
        else {
          if (Number.isInteger(preceding)) {
            clause += `${preceding} preceding and `;
          }
          else {
            throw Error('Invalid "preceding" argument');
          }
        }
      }
      if (following === 'unbounded') {
        clause += 'unbounded following';
      }
      else {
        if (Number.isInteger(following)) {
          clause += `${following} following and `;
        }
        else {
          throw Error('Invalid "following" argument');
        }
      }
    }
    sql += ` over (${clause.trim()})`;
  }
  return sql;
}

const processMethod = (options) => {
  const {
    db,
    method,
    requests
  } = options;
  const statements = [];
  const { name, args } = method.request;
  const isWindow = method.type === 'window';
  if (['jsonGroupArray', 'jsonGroupObject', 'jsonObject'].includes(name)) {
    const param = args.at(0);
    if (name === 'jsonGroupArray') {
      const arg = isWindow ? param.select : param;
      let sql;
      if (typeof arg === 'symbol') {
        const body = processArg({
          db,
          arg,
          requests
        });
        sql = `json_group_array(${body})`;
      }
      else {
        const body = getObjectBody({
          db,
          arg,
          requests
        });
        sql = `json_group_array(json_object(${body}))`;
      }
      if (isWindow) {
        const clause = processWindow({
          db,
          query: param,
          requests
        });
        sql += ` ${clause}`;
      }
      return sql;
    }
    else if (name === 'jsonGroupObject') {
      if (isWindow) {
        const { key, value } = param;
        const keySelector = processArg({
          db,
          arg: key,
          requests
        });
        const valueSelector = processArg({
          db,
          arg: value,
          requests
        });
        const windowClause = processWindow({
          db,
          query: param,
          requests
        });
        return `json_group_object(${keySelector}, ${valueSelector})${windowClause}`;
      }
    }
    else {
      const body = getObjectBody({
        db,
        arg: param,
        requests
      });
      return `json_object(${body})`;
    }
  }
  const adjusted = name
    .replaceAll(/([A-Z])/gm, '_$1')
    .toLowerCase();
  if (isWindow) {
    const query = args.at(0);
    let sql;
    if (name === 'ntile') {
      const { groups } = query;
      if (!Number.isInteger(groups)) {
        throw Error('Invalid "groups" argument');
      }
      sql = `ntil(${groups})`;
    }
    else if (['min', 'max', 'avg', 'sum', 'count'].includes(name)) {
      const { column, distinct } = query;
      const field = column || distinct;
      const selector = processArg({
        db,
        arg: field,
        requests
      });
      sql = `${name}(${distinct ? 'distinct ' : ''}${selector})`;
    }
    else {
      sql = `${adjusted}()`;
    }
    const clause = processWindow({
      db,
      query,
      requests
    });
    if (clause) {
      sql += ` ${clause}`;
    }
    return sql;
  }
  for (const arg of args) {
    const method = findRequest(requests, arg);
    if (method) {
      const statement = processMethod({
        db,
        method,
        requests
      });
      statements.push(statement);
      continue;
    }
    const column = requests.column.find(r => r === arg);
    if (column) {
      const { selector } = verify(db, column);
      statements.push(selector);
    }
    else {
      const literal = toLiteral(db, arg);
      statements.push(literal);
    }
  }
  const operator = operators.get(name);
  if (operator) {
    return statements.join(` ${operator} `);
  }
  return `${adjusted}(${statements.join(', ')})`;
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

const findRequest = (requests, symbol) => {
  for (const [key, value] of Object.entries(requests)) {
    if (['compute', 'aggregate', 'window'].includes(key)) {
      const request = value.find(r => r.symbol === symbol);
      if (request) {
        return {
          request,
          type: key
        }
      }
    }
  }
}

const toWhere = (options) => {
  const {
    db,
    where,
    requests
  } = options;
  const type = options.type || 'and';
  const statements = [];
  const whereKeys = Object.getOwnPropertySymbols(where);
  for (const symbol of whereKeys) {
    let selector;
    const method = findRequest(requests, symbol);
    if (method) {
      selector = processMethod({
        db,
        method,
        requests
      });
    }
    else {
      selector = verify(db, symbol).selector;
    }
    const value = where[symbol];
    const compareValue = requests.compare.find(r => r === value);
    const methodValue = findRequest(requests, value);
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
    else if (methodValue) {
      const clause = processMethod({
        db,
        method: methodValue,
        requests
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
          requests
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
        requests.column.push(symbol);
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
  const requests = {
    column: [],
    compare: [],
    compute: [],
    aggregate: [],
    window: []
  };
  const tableHandler = {
    get: function(target, property) {
      return makeHandler(property);
    }
  };
  const tableProxy = new Proxy({}, tableHandler);
  const compareHandler = {
    get: function(target, property) {
      const request = {
        method: property,
        param: null
      };
      requests.compare.push(request);
      return (param) => {
        request.param = param;
        return request;
      }
    }
  }
  const compareProxy = new Proxy({}, compareHandler);
  const makeProxy = (requests) => {
    const handler = {
      get: function(target, property) {
        const symbol = Symbol(property);
        const request = {
          name: property,
          args: null,
          symbol
        };
        requests.push(request);
        return (...args) => {
          request.args = args;
          return symbol;
        };
      }
    }
    return new Proxy({}, handler);
  }
  const computeProxy = makeProxy(requests.compute);
  const aggregateProxy = makeProxy(requests.aggregate);
  const windowProxy = makeProxy(requests.window);
  const context = {
    tables: tableProxy,
    compare: compareProxy,
    compute: computeProxy,
    aggregate: aggregateProxy,
    window: windowProxy
  };
  const result = expression(context);
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
    const method = findRequest(requests, value);
    if (method) {
      const computed = method.request;
      const selector = processMethod({
        db,
        method,
        requests
      });
      statements.push(`${selector} as ${key}`);
      const name = computed
        .name
        .replaceAll(/([A-Z])/gm, '_$1')
        .toLowerCase();
      if (['aggregate', 'window'].includes(method.type) && computed.name === 'min' || computed.name === 'max') {
        const param = computed.args.at(0);
        const arg = method.type === 'aggregate' ? param : param.column;
        const request = requests.column.find(r => r === arg);
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
    const symbol = requests.column.find(r => r === value);
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
      requests
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
      requests
    }));
    sql += ` group by ${statements.join(', ')}`;
  }
  if (having) {
    const clause = toWhere({
      db,
      where: having,
      requests
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
