import { returnTypes, notNullFunctions } from './parsers/returnTypes.js';
import methods from './methods.js';

const operators = new Map([
  ['plus', '+'],
  ['minus', '-'],
  ['divide', '/'],
  ['multiply', '*']
]);

const compareMethods = ['not', 'gt', 'lt', 'lte', 'like', 'natch', 'glob', 'eq'];
const computeMethods = ['abs', 'coalesce', 'concat', 'concatWs', 'format', 'glob', 'hex', 'if', 'instr', 'length', 'lower', 'ltrim', 'max', 'min', 'nullif', 'octetLength', 'replace', 'round', 'rtrim', 'sign', 'substring', 'trim', 'unhex', 'unicode', 'upper', 'date', 'time', 'dateTime', 'julianDay', 'unixEpoch', 'strfTime', 'timeDiff', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'ceil', 'cos', 'cosh', 'degrees', 'exp', 'floor', 'ln', 'log', 'mod', 'pi', 'power', 'radians', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc', 'json', 'jsonExtract', 'plus', 'minus', 'divide', 'multiply', 'jsonObject', 'jsonArrayLength'];
const windowMethods = ['count', 'min', 'max', 'avg', 'sum', 'rowNumber', 'rank', 'denseRank', 'percentRank', 'cumeDist', 'ntile', 'jsonGroupArray', 'jsonGroupObject'];

const processArg = (options) => {
  const {
    db,
    arg,
    requests
  } = options;
  const subMethod = requests.find(r => r.symbol === arg);
  if (subMethod) {
    return processMethod(subMethod);
  }
  const column = requests.find(r => r === arg);
  if (column) {
    return verify(db, column).selector;
  }
  return toLiteral(db, arg);
}

const getObjectBody = (options) => {
  const {
    db,
    select,
    requests
  } = options;
  const items = [];
  for (const [key, value] of Object.entries(select)) {
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
  const arg = method.args.at(0);
  const isSymbol = typeof arg === 'symbol';
  if (['jsonGroupArray', 'jsonGroupObject', 'jsonObject'].includes(method.name)) {
    if (method.name === 'jsonGroupArray') {
      let sql;
      if (isSymbol) {
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
          select: arg.select,
          requests
        });
        sql = `json_group_array(json_object(${body}))`;
        const clause = processWindow({
          db,
          query: arg,
          requests
        });
        sql += ` ${clause}`;
      }
      return sql.trim();
    }
    else if (method.name === 'jsonGroupObject') {
      let key;
      let value;
      if (isSymbol) {
        key = arg;
        value = method.args.at(1);
      }
      else {
        key = arg.key;
        value = arg.value;
      }
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
      let windowClause = '';
      if (!isSymbol) {
        windowClause = processWindow({
          db,
          query: arg,
          requests
        });
      }
      return `json_group_object(${keySelector}, ${valueSelector})${windowClause}`;
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
  const adjusted = method.name
    .replaceAll(/([A-Z])/gm, '_$1')
    .toLowerCase();
  const isSpecial = ['min', 'max'].includes(method.name) && method.args.length === 1;
  if (method.isWindow && (!method.isComputed || isSpecial)) {
    let sql;
    if (method.name === 'ntile') {
      const { groups } = arg;
      if (!Number.isInteger(groups)) {
        throw Error('Invalid "groups" argument');
      }
      sql = `ntil(${groups})`;
    }
    else if (['min', 'max'].includes(method.name) && isSymbol) {
      const selector = processArg({
        db,
        arg,
        requests
      });
      return `${method.name}(${selector})`;
    }
    else if (method.name === 'count' && !arg) {
      return 'count(*)';
    }
    else if (['min', 'max', 'avg', 'sum', 'count'].includes(method.name)) {
      const { column, distinct } = arg;
      const field = column || distinct;
      const selector = processArg({
        db,
        arg: field,
        requests
      });
      sql = `${method.name}(${distinct ? 'distinct ' : ''}${selector})`;
    }
    else {
      sql = `${adjusted}()`;
    }
    const clause = processWindow({
      db,
      query: arg,
      requests
    });
    if (clause) {
      sql += ` ${clause}`;
    }
    return sql;
  }
  for (const arg of method.args) {
    const method = requests.find(r => r.symbol === arg);
    if (method) {
      const statement = processMethod({
        db,
        method,
        requests
      });
      statements.push(statement);
      continue;
    }
    const column = requests.find(r => r === arg);
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
    const method = requests.find(r => r.symbol === symbol);
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
    const compareValue = requests.find(r => r === value && r.isCompare);
    const methodValue = requests.find(r => r.symbol === value);
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
  const makeTableHandler = (table) => {
    selectTable = table;
    const keys = Object.keys(db.columns[table]);
    const handler = {
      get: function(target, property) {
        const symbol = Symbol(`${table}.${property}`);
        requests.push(symbol);
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
  const requests = [];
  const handler = {
    get: function(target, property) {
      const isCompare = compareMethods.includes(property);
      const isCompute = computeMethods.includes(property);
      const isWindow = windowMethods.includes(property);
      if (isCompare) {
        const request = {
          method: property,
          isCompare,
          param: null
        };
        requests.push(request);
        return (param) => {
          request.param = param;
          return request;
        }
      }
      if (isCompute || isWindow) {
        const symbol = Symbol(property);
        const request = {
          name: property,
          isCompute,
          isWindow,
          args: null,
          symbol
        };
        requests.push(request);
        return (...args) => {
          request.args = args;
          return symbol;
        };
      }
      return makeTableHandler(property);
    }
  }
  const proxy = new Proxy({}, handler);
  const result = expression(proxy);
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
    const method = requests.find(r => r.symbol === value);
    if (method) {
      const selector = processMethod({
        db,
        method,
        requests
      });
      statements.push(`${selector} as ${key}`);
      const name = method
        .name
        .replaceAll(/([A-Z])/gm, '_$1')
        .toLowerCase();
      if (method.args.length === 1 && (['min', 'max'].includes(method.name))) {
        const arg = method.args.at(0);
        let column;
        if (typeof arg === 'symbol') {
          column = arg;
        }
        else {
          column = arg.distinct || arg.column;
        }
        const request = requests.find(r => r === column);
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
    const symbol = requests.find(r => r === value);
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
