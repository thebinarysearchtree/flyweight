import { returnTypes } from './parsers/returnTypes.js';
import { getPlaceholder } from './utils.js';
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

const addParam = (options) => {
  const { db, params, value } = options;
  if (typeof value === 'symbol') {
    return verify(db, value).selector;
  }
  const placeholder = getPlaceholder();
  params[placeholder] = db.jsToDb(value);
  return `$${placeholder}`;
}

const getParamType = (param) => {
  const type = typeof param;
  if (param === null) {
    return 'null';
  }
  if (type === 'string') {
    return 'text';
  }
  if (type === 'number') {
    return 'real';
  }
  if (type === 'boolean') {
    return type;
  }
  if (param instanceof Date) {
    return 'date';
  }
  if (Buffer && Buffer.isBuffer(param)) {
    return 'blob';
  }
  return 'json';
}

const processArg = (options) => {
  const {
    db,
    arg,
    params,
    requests
  } = options;
  const method = requests.find(r => r.symbol === arg);
  if (method) {
    return processMethod({
      db,
      method,
      params,
      requests
    });
  }
  const column = requests.find(r => r === arg);
  if (column) {
    const { selector, type } = verify(db, column);
    return {
      sql: selector,
      type
    };
  }
  const sql = addParam({
    db,
    params,
    value: arg,
  });
  const type = getParamType(arg);
  return {
    sql,
    type
  };
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
      const valueArg = processArg({
        db,
        arg: value,
        requests
      });
      items.push(valueArg.sql);
    }
    else {
      const statement = addParam({
        db,
        params,
        value
      });
      items.push(statement);
    }
  }
  return items.join(', ');
}

const processWindow = (options) => {
  const {
    db,
    query,
    params,
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
      params,
      requests
    });
    sql += `filter (where ${clause})`;
  }
  if (partitionBy || orderBy) {
    let clause = '';
    if (partitionBy) {
      const items = Array.isArray(partitionBy) ? partitionBy : [partitionBy];
      const statements = items
        .map(arg => processArg({
          db,
          arg,
          params,
          requests
        }))
        .map(a => a.sql);
      clause += ` partition by ${statements.join(', ')}`;
    }
    if (orderBy) {
      const items = Array.isArray(orderBy) ? orderBy : [orderBy];
      const statements = items
        .map(arg => processArg({
          db,
          arg,
          params,
          requests
        }))
        .map(a => a.sql);
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
    params,
    requests
  } = options;
  if (method.alias) {
    return {
      sql: method.alias,
      type: method.type
    };
  }
  const statements = [];
  const arg = method.args.at(0);
  const isSymbol = typeof arg === 'symbol';
  const name = toDbName(method.name);
  const operator = operators.get(name);
  let type = operator ? 'real' : returnTypes[name];
  if (['json_group_array', 'json_group_object', 'json_object'].includes(name)) {
    if (name === 'json_group_array') {
      let sql;
      const valueArg = isSymbol ? arg : (typeof arg.select === 'symbol' ? arg.select : null);
      if (valueArg) {
        const body = processArg({
          db,
          arg: valueArg,
          params,
          requests
        });
        sql = `${name}(${body.sql})`;
      }
      else {
        const body = getObjectBody({
          db,
          select: arg.select,
          params,
          requests
        });
        sql = `${name}(json_object(${body}))`;
      }
      const clause = processWindow({
        db,
        query: arg,
        params,
        requests
      });
      sql += ` ${clause}`;
      return {
        sql: sql.trim(),
        type
      };
    }
    else if (name === 'json_group_object') {
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
      const keyArg = processArg({
        db,
        arg: key,
        params,
        requests
      });
      const valueArg = processArg({
        db,
        arg: value,
        params,
        requests
      });
      let windowClause = '';
      if (!isSymbol) {
        windowClause = processWindow({
          db,
          query: arg,
          params,
          requests
        });
      }
      const sql = `${name}(${keyArg.sql}, ${valueArg.sql})${windowClause}`;
      return {
        sql,
        type
      };
    }
    else {
      const body = getObjectBody({
        db,
        select: arg,
        params,
        requests
      });
      const sql = `${name}(${body})`;
      return {
        sql,
        type
      };
    }
  }
  const isSpecial = ['min', 'max'].includes(name) && method.args.length === 1;
  if (method.isWindow && (!method.isComputed || isSpecial)) {
    let sql;
    if (name === 'ntile') {
      const { groups } = arg;
      if (!Number.isInteger(groups)) {
        throw Error('Invalid "groups" argument');
      }
      sql = `ntil(${groups})`;
    }
    else if (['min', 'max', 'avg', 'sum', 'count'].includes(name) && isSymbol) {
      const bodyArg = processArg({
        db,
        arg,
        params,
        requests
      });
      const sql = `${name}(${bodyArg.sql})`;
      if (['min', 'max'].includes(name)) {
        type = bodyArg.type;
      }
      return {
        sql,
        type
      };
    }
    else if (name === 'count' && !arg) {
      const sql = 'count(*)';
      return {
        sql,
        type
      };
    }
    else if (['min', 'max', 'avg', 'sum', 'count'].includes(name)) {
      const { column, distinct } = arg;
      const field = column || distinct;
      const bodyArg = processArg({
        db,
        arg: field,
        params,
        requests
      });
      if (['min', 'max'].includes(name)) {
        type = bodyArg.type;
      }
      sql = `${name}(${distinct ? 'distinct ' : ''}${bodyArg.sql})`;
    }
    else {
      sql = `${name}()`;
    }
    const clause = processWindow({
      db,
      query: arg,
      params,
      requests
    });
    if (clause) {
      sql += ` ${clause}`;
    }
    return {
      sql,
      type
    };
  }
  for (const arg of method.args) {
    const method = requests.find(r => r.symbol === arg);
    if (method) {
      const methodArg = processMethod({
        db,
        method,
        params,
        requests
      });
      statements.push(methodArg.sql);
      continue;
    }
    const column = requests.find(r => r === arg);
    if (column) {
      const { selector } = verify(db, column);
      statements.push(selector);
    }
    else {
      const literal = addParam({
        db,
        params,
        value: arg
      });
      statements.push(literal);
    }
  }
  let sql;
  if (operator) {
    sql = statements.join(` ${operator} `);
  }
  else {
    sql = `${name}(${statements.join(', ')})`;
  }
  return {
    sql,
    type
  };
}

const verify = (db, symbol) => {
  const [table, column] = symbol.description.split('.');
  const selector = `${table}.${column}`;
  if (!db.tables[table] || !db.columns[table][column]) {
    throw Error(`Table or column from ${selector} does not exist`);
  }
  const type = db.columns[table][column];
  return {
    table,
    column,
    type,
    selector
  }
}

const toWhere = (options) => {
  const {
    db,
    where,
    params,
    requests
  } = options;
  const type = options.type || 'and';
  const statements = [];
  const whereKeys = Object.getOwnPropertySymbols(where);
  for (const symbol of whereKeys) {
    let selector;
    const method = requests.find(r => r.symbol === symbol);
    if (method) {
      if (method.alias) {
        selector = method.alias;
      }
      else {
        const keyArg = processMethod({
          db,
          method,
          params,
          requests
        });
        selector = keyArg.sql;
      }
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
        if (param === null) {
          statements.push(`${selector} is not null`);
        }
        else {
          const statement = addParam({
            db,
            params,
            value: param
          });
          statements.push(`${selector} != ${statement}`);
        }
      }
      else {
        const operator = methods.get(method);
        const statement = addParam({
          db,
          params,
          value: param
        });
        statements.push(`${selector} ${operator} ${statement}`);
      }
    }
    else if (methodValue) {
      const methodArg = processMethod({
        db,
        method: methodValue,
        params,
        requests
      });
      statements.push(`${selector} = ${methodArg.sql}`);
    }
    else if (value === null) {
      statements.push(`${selector} is null`);
    }
    else {
      const statement = addParam({
        db,
        params,
        value
      });
      statements.push(`${selector} = ${statement}`);
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
          params,
          requests
        }))
        .join(` ${type} `);
      statements.push(statement);
    }
  }
  return statements.join(` ${type} `);
}

const toDbName = (name) => {
  const excluded = ['dateTime', 'julianDay', 'unixEpoch', 'strfTime', 'timeDiff'];
  if (excluded.includes(name)) {
    return name.toLowerCase();
  }
  return name
    .replaceAll(/([A-Z])/gm, '_$1')
    .toLowerCase();
}

const processQuery = async (db, expression) => {
  const params = {};
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
          alias: null,
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
    limit
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
  const statements = [];
  const parsers = {};
  for (const [key, value] of Object.entries(select)) {
    const method = requests.find(r => r.symbol === value);
    if (method) {
      const keyArg = processMethod({
        db,
        method,
        params,
        requests
      });
      method.alias = key;
      method.type = keyArg.type;
      statements.push(`${keyArg.sql} as ${key}`);
      const name = toDbName(method.name);
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
          const type = db.columns[table][column];
          const parser = db.getDbToJsConverter(type);
          if (parser) {
            parsers[key] = parser;
          }
          continue;
        }
      }
      const type = returnTypes[name];
      const parser = db.getDbToJsConverter(type);
      if (parser) {
        parsers[key] = parser;
      }
      continue;
    }
    const symbol = requests.find(r => r === value);
    const { table, column, selector } = verify(db, symbol);
    statements.push(`${selector} as ${key}`);
    const type = db.columns[table][column];
    const parser = db.getDbToJsConverter(type);
    if (parser) {
      parsers[key] = parser;
    }
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
      params,
      requests
    });
    if (clause) {
      sql += ` where ${clause}`;
    }
  }
  if (groupBy) {
    const adjusted = Array.isArray(groupBy) ? groupBy : [groupBy];
    const statements = adjusted
      .map(c => processArg({
        db,
        arg: c,
        params,
        requests
      }))
      .map(a => a.sql);
    sql += ` group by ${statements.join(', ')}`;
  }
  if (having) {
    const clause = toWhere({
      db,
      where: having,
      params,
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
    const placeholder = addParam({
      db,
      params,
      value: offset
    });
    sql += ` offset ${placeholder}`;
  }
  if (limit) {
    const placeholder = addParam({
      db,
      params,
      value: limit
    });
    sql += ` limit ${placeholder}`;
  }
  const rows = await db.all({
    query: sql,
    params
  });
  if (Object.keys(parsers).length > 0) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      for (const [key, parser] of Object.entries(parsers)) {
        row[key] = parser(row[key]);
      }
    }
  }
  return rows;
}

export {
  processQuery
}
