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
const computeMethods = ['abs', 'coalesce', 'concat', 'concatWs', 'format', 'glob', 'hex', 'if', 'instr', 'length', 'lower', 'ltrim', 'max', 'min', 'nullif', 'octetLength', 'replace', 'round', 'rtrim', 'sign', 'substring', 'trim', 'unhex', 'unicode', 'upper', 'date', 'time', 'dateTime', 'julianDay', 'unixEpoch', 'strfTime', 'timeDiff', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'ceil', 'cos', 'cosh', 'degrees', 'exp', 'floor', 'ln', 'log', 'mod', 'pi', 'power', 'radians', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc', 'json', 'extract', 'plus', 'minus', 'divide', 'multiply', 'object', 'arrayLength'];
const windowMethods = ['count', 'min', 'max', 'avg', 'sum', 'rowNumber', 'rank', 'denseRank', 'percentRank', 'cumeDist', 'ntile', 'lag', 'lead', 'firstValue', 'lastValue', 'nthValue', 'group'];

const addParam = (options) => {
  const { db, params, value } = options;
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
  const request = requests.get(arg);
  if (request && !request.isColumn) {
    return processMethod({
      db,
      method: request,
      params,
      requests
    });
  }
  else if (request && request.isColumn) {
    return {
      sql: request.selector,
      type: request.type
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
      const sql = valueArg.type === 'json' ? `json(${valueArg.sql})` : valueArg.sql;
      items.push(sql);
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
    const processItems = (items) => {
      const args = items.map(arg => processArg({
          db,
          arg,
          params,
          requests
        }));
      return args.map(a => a.sql).join(', ');
    }
    if (partitionBy) {
      const items = Array.isArray(partitionBy) ? partitionBy : [partitionBy];
      clause += ` partition by ${processItems(items)}`;
    }
    if (orderBy) {
      const items = Array.isArray(orderBy) ? orderBy : [orderBy];
      clause += ` order by ${processItems(items)}${desc ? ' desc' : ''}`;
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
  const arg = method.args.at(0);
  const isSymbol = typeof arg === 'symbol';
  const name = toDbName(method);
  const operator = operators.get(name);
  let type = operator ? 'real' : (method.isCompare ? 'boolean' : returnTypes[name]);
  if (method.isCompare) {
    const result = processArg({
      db,
      arg,
      params,
      requests
    });
    const selector = result.sql;
    const to = method.args.at(1);
    if (name === 'not' && to === null) {
      return {
        sql: `${selector} is not null`,
        type
      }
    }
    const operator = methods.get(name);
    const toResult = processArg({
      db,
      arg: to,
      params,
      requests
    });
    return {
      sql: `${selector} ${operator} ${toResult.sql}`,
      type
    }
  }
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
        const bodySql = body.type === 'json' ? `json(${body.sql})` : body.sql;
        sql = `${name}(${bodySql})`;
      }
      else {
        const select = arg.select ? arg.select : arg;
        const body = getObjectBody({
          db,
          select,
          params,
          requests
        });
        sql = `${name}(json_object(${body}))`;
      }
      if (arg.select) {
        const clause = processWindow({
          db,
          query: arg,
          params,
          requests
        });
        sql += ` ${clause}`;
      }
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
  if (method.isWindow && (!method.isCompute || isSpecial)) {
    let sql;
    if (name === 'ntile') {
      const { groups } = arg;
      if (!Number.isInteger(groups)) {
        throw Error('Invalid "groups" argument');
      }
      sql = `ntil(${groups})`;
    }
    else if (name === 'lag' || name === 'lead') {
      const { expression, offset, otherwise } = arg;
      const args = [expression, offset, otherwise];
      const parsed = args
        .filter(a => a !== undefined)
        .map(arg => processArg({
          db,
          arg,
          params,
          requests
        }));
      if (parsed.length === 1) {
        type = parsed.at(0).type;
      }
      else if (parsed.length === 3) {
        if (parsed.at(0).type === parsed.at(2).type) {
          type = parsed.at(0).type;
        }
      }
      sql = `${name}(${parsed.map(a => a.sql).join(', ')})`;
    }
    else if (['first_value', 'last_value', 'nth_value'].includes(name)) {
      const { expression, row } = arg;
      const args = [expression, row];
      const parsed = args
        .filter(a => a !== undefined)
        .map(arg => processArg({
          db,
          arg,
          params,
          requests
        }));
      type = parsed.at(0).type;
      sql = `${name}(${parsed.map(a => a.sql).join(', ')})`;
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
  const processed = method.args.map(arg => processArg({
    db,
    arg,
    params,
    requests
  }));
  if (method.name === 'if' && method.args.length === 3) {
    const [l, r] = processed.slice(1).map(p => p.type);
    if (l === r) {
      type = r;
    }
  }
  const statements = processed.map(p => p.sql);
  let sql;
  if (operator) {
    sql = statements.join(` ${operator} `);
  }
  else {
    sql = `${name}(${statements.join(', ')})`;
  }
  if (['coalesce', 'min', 'max'].includes(name)) {
    if (processed.length > 1) {
      const types = processed.map(p => p.type);
      const unique = new Set(types);
      if (unique.size === 1) {
        const current = types.at(0);
        if (['boolean', 'date'].includes(current)) {
          type = current;
        }
      }
    }
  }
  if (name === 'nullif') {
    const current = processed.map(p => p.type).at(0);
    if (['boolean', 'date'].includes(current)) {
      type = current;
    }
  }
  return {
    sql,
    type
  };
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
    const request = requests.get(symbol);
    if (!request.isColumn) {
      if (request.alias) {
        selector = request.alias;
      }
      else {
        const keyArg = processMethod({
          db,
          method: request,
          params,
          requests
        });
        selector = keyArg.sql;
      }
    }
    else {
      selector = request.selector;
    }
    const value = where[symbol];
    const valueRequest = requests.get(value);
    if (valueRequest && valueRequest.isCompare) {
      const { name, args } = valueRequest;
      const param = args.at(0);
      if (name === 'not' && param === null) {
        statements.push(`${selector} is not null`);
      }
      else {
        const operator = methods.get(name);
        const result = processArg({
          db,
          arg: param,
          params,
          requests
        });
        statements.push(`${selector} ${operator} ${result.sql}`);
      }
    }
    else if (valueRequest && !valueRequest.isColumn) {
      const methodArg = processMethod({
        db,
        method: valueRequest,
        params,
        requests
      });
      statements.push(`${selector} = ${methodArg.sql}`);
    }
    else if (valueRequest && valueRequest.isColumn) {
      statements.push(`${selector} = ${valueRequest.selector}`);
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

const toDbName = (method) => {
  const { name, args } = method;
  const excluded = ['dateTime', 'julianDay', 'unixEpoch', 'strfTime', 'timeDiff'];
  if (excluded.includes(name)) {
    return name.toLowerCase();
  }
  if (name === 'if') {
    return 'iif';
  }
  if (name === 'group') {
    if (args.length === 2) {
      return 'json_group_object';
    }
    return 'json_group_array';
  }
  if (name === 'arrayLength') {
    return 'json_array_length';
  }
  if (name === 'extract') {
    return 'json_extract';
  }
  if (name === 'object') {
    return 'json_object';
  }
  return name
    .replaceAll(/([A-Z])/gm, '_$1')
    .toLowerCase();
}

const makeProxy = (options) => {
  const {
    db,
    requests,
    subqueries
  } = options;
  const existing = Object.keys(db.columns);
  const usedAliases = new Set(existing);
  const makeAlias = (table) => {
    const letter = table ? table[0].toLowerCase() : 's';
    for (let i = 0; i < 100; i++) {
      const alias = i ? `${letter}${i}` : letter;
      if (!usedAliases.has(alias)) {
        usedAliases.add(alias);
        return alias;
      }
    }
    throw Error('Failed to create a unique table alias');
  }
  const makeTableHandler = (table) => {
    const tableAlias = makeAlias(table);
    const keys = Object.keys(db.columns[table]);
    const handler = {
      get: function(target, property) {
        if (!db.tables[table] || !db.columns[table][property]) {
          throw Error(`Table or column "${table}.${property}" does not exist`);
        }
        const symbol = Symbol();
        const type = db.columns[table][property];
        requests.set(symbol, {
          table,
          column: property,
          selector: `${tableAlias}.${property}`,
          type,
          isColumn: true,
          tableAlias
        });
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
  const handler = {
    get: function(target, property) {
      if (property === 'use') {
        return (context) => {
          const keys = Object.keys(context.columns);
          const tableAlias = makeAlias();
          subqueries.push({
            alias: tableAlias,
            sql: context.sql,
            params: context.params
          });
          const handler = {
            get: function(target, property) {
              const symbol = Symbol();
              const type = context.columns[property];
              requests.set(symbol, {
                column: property,
                selector: `${tableAlias}.${property}`,
                type,
                isColumn: true,
                tableAlias
              });
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
          }
          return new Proxy({}, handler);
        }
      }
      const isCompare = compareMethods.includes(property);
      const isCompute = computeMethods.includes(property);
      const isWindow = windowMethods.includes(property);
      const symbol = Symbol();
      if (isCompare) {
        const request = {
          name: property,
          isCompare,
          args: null
        };
        requests.set(symbol, request);
        return (...args) => {
          request.args = args;
          return symbol;
        }
      }
      if (isCompute || isWindow) {
        const request = {
          name: property,
          isCompute,
          isWindow,
          args: null,
          alias: null
        };
        requests.set(symbol, request);
        return (...args) => {
          request.args = args;
          return symbol;
        };
      }
      return makeTableHandler(property);
    }
  }
  return new Proxy({}, handler);
}

const replaceParams = (subqueries, sql, params) => {
  if (subqueries.length === 0) {
    return {
      sql,
      params
    }
  }
  let i = 1;
  const combined = {};
  const statements = [];
  const replace = (sql, params) => {
    return sql.replaceAll(/\$p_\d+/gmi, (m) => {
      const updated = `p_${i}`;
      i++;
      const existing = m.substring(1);
      combined[updated] = params[existing];
      return `$${updated}`;
    });
  }
  for (const query of subqueries) {
    const { alias, sql, params } = query;
    const adjusted = replace(sql, params);
    statements.push(`${alias} as (${adjusted})`);
  }
  const adjusted = replace(sql, params);
  const statement = `with ${statements.join(', ')} ${adjusted}`;
  return {
    sql: statement,
    params: combined
  }
}

const processQuery = (db, expression) => {
  const requests = new Map();
  const subqueries = [];
  const proxy = makeProxy({
    db,
    requests,
    subqueries
  });
  const params = {};
  const result = expression(proxy);
  const {
    where,
    groupBy,
    having,
    orderBy,
    desc,
    offset,
    limit
  } = result;
  const select = { ...result.select, ...result.optional };
  const used = new Set();
  let first;
  let join;
  if (result.join) {
    if (Array.isArray(result.join[0])) {
      join = result.join
    }
    else {
      join = [result.join];
    }
    join = join.map(tuple => {
      const [l, r, type] = tuple;
      return [requests.get(l), requests.get(r), type];
    })
  }
  if (join) {
    first = join[0][0];
    used.add(first.table);
  }
  let sql = 'select ';
  const statements = [];
  const parsers = {};
  const columnTypes = {};
  for (const [key, value] of Object.entries(select)) {
    let parser;
    const request = requests.get(value);
    if (!request.isColumn) {
      const valueArg = processMethod({
        db,
        method: request,
        params,
        requests
      });
      request.alias = key;
      request.type = valueArg.type;
      columnTypes[key] = valueArg.type;
      statements.push(`${valueArg.sql} as ${key}`);
      parser = db.getDbToJsConverter(valueArg.type);
    }
    else {
      if (!join && request.column === key) {
        statements.push(request.selector);
      }
      else {
        let sql = request.selector;
        if (request.column !== key) {
          sql += ` as ${key}`;
        }
        statements.push(sql);
      }
      columnTypes[key] = request.type;
      parser = db.getDbToJsConverter(request.type);
    }
    if (parser) {
      parsers[key] = parser;
    }
  }
  sql += statements.join(', ');
  if (join) {
    sql += ` from ${first.table} ${first.tableAlias}`;
    for (const tuple of join) {
      const [l, r, type] = tuple;
      const joinClause = type ? `${type} join` : 'join';
      const [from, to] = used.has(l.table) ? [r, l] : [l, r];
      const table = from.table || from.tableAlias;
      const tableClause = from.table ? `${from.table} ${from.tableAlias}` : from.tableAlias;
      used.add(table);
      sql += ` ${joinClause} ${tableClause} on ${from.selector} = ${to.selector}`;
    }
  }
  else {
    const columns = Array.from(requests.values()).filter(r => r.isColumn);
    if (columns.length > 0) {
      const { tableAlias, table } = columns.at(0);
      sql += ` from ${table} ${tableAlias}`;
    }
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
    const items = Array.isArray(orderBy) ? orderBy : [orderBy];
    const clause = items
      .map(arg => processArg({
        db,
        arg,
        params,
        requests
      }))
      .map(a => a.sql)
      .join(', ');
    sql += ` order by ${clause}`;
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
  const post = (rows) => {
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
  const adjusted = replaceParams(subqueries, sql, params);
  return {
    ...adjusted,
    columns: columnTypes,
    post
  }
}

export {
  processQuery,
  makeProxy
}
