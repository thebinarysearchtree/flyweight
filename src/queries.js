let paramCount = 1;

const getPlaceholder = () => {
  const count = paramCount;
  paramCount++;
  if (paramCount > (2 ** 20)) {
    paramCount = 0;
  }
  return `p_${count}`;
}

const cleanse = (params) => {
  if (!params) {
    return params;
  }
  const adjusted = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || !/^p_\d+$/.test(key)) {
      continue;
    }
    adjusted[key] = value;
  }
  return adjusted;
}

const reservedWords = [
  'where',
  'select',
  'include',
  'orderBy',
  'desc',
  'limit',
  'offset',
  'distinct'
];

const methods = new Map([
  ['not', '!='],
  ['gt', '>'],
  ['gte', '>='],
  ['lt', '<'],
  ['lte', '<='],
  ['like', 'like'],
  ['match', 'match'],
  ['glob', 'glob'],
  ['range', null],
  ['includes', null],
  ['some', null],
  ['eq', '=']
]);

const getConditions = (table, column, query, params) => {
  const handler = {
    get: function(target, property) {
      target.push(property);
      if (methods.has(property)) {
        return (value) => {
          target.push(value);
          return target;
        }
      }
      return proxy;
    }
  }
  const proxy = new Proxy([], handler);
  const chain = query(proxy);
  const value = chain.pop();
  const method = chain.pop();
  if (!methods.has(method)) {
    throw Error(`Invalid operator: ${method}`);
  }
  const path = chain.length === 0 ? null : `$.${chain.join('.')}`;
  const placeholder = getPlaceholder();
  if (path) {
    params[placeholder] = path;
  }
  const selector = path ? `json_extract(${table}.${column}, $${placeholder})` : `${table}.${column}`;
  const conditions = [];
  const fromClauses = [];
  if (method === 'not') {
    if (Array.isArray(value)) {
      const placeholder = getPlaceholder();
      params[placeholder] = value;
      conditions.push(`${selector} not in (select json_each.value from json_each($${placeholder}))`);
    }
    else if (value === null) {
      conditions.push(`${selector} is not null`);
    }
  }
  else if (method === 'range') {
    for (const [method, param] of Object.entries(value)) {
      if (!['gt', 'gte', 'lt', 'lte'].includes(method)) {
        throw Error('Invalid range statement');
      }
      const placeholder = getPlaceholder();
      params[placeholder] = param;
      const operator = methods.get(method);
      conditions.push(`${selector} ${operator} $${placeholder}`);
    }
  }
  else if (method === 'includes') {
    const alias = `${table}_${column.replace('.', '_')}_json`;
    const placeholder = getPlaceholder();
    params[placeholder] = value;
    conditions.push(`${alias}.value = $${placeholder}`);
    fromClauses.push(`json_each(${selector}) as ${alias}`);
  }
  else if (method === 'some') {
    const alias = `${table}_${column.replace('.', '_')}_json`;
    fromClauses.push(`json_each(${selector}) as ${alias}`);
    const result = getConditions(alias, 'value', value, params);
    conditions.push(...result.conditions);
    fromClauses.push(...result.fromClauses);
  }
  else {
    const placeholder = getPlaceholder();
    params[placeholder] = value;
    const operator = methods.get(method);
    conditions.push(`${selector} ${operator} $${placeholder}`);
  }
  return {
    conditions,
    fromClauses
  }
}

const getPlaceholders = (supports, params, columnTypes) => {
  const columns = Object.keys(params);
  return columns.map(columnName => {
    const placeholder = getPlaceholder();
    params[placeholder] = params[columnName];
    if (supports.jsonb && columnTypes[columnName] === 'json') {
      return `jsonb($${placeholder})`;
    }
    return `$${placeholder}`;
  });
}

const adjust = (db, table, params) => {
  const columnTypes = db.columnSets[table];
  const adjusted = db.adjust(params);
  const processed = {};
  for (const [name, value] of Object.entries(adjusted)) {
    if (db.supports.jsonb && columnTypes[name] === 'json') {
      processed[name] = JSON.stringify(value);
    }
    else {
      processed[name] = value;
    }
  }
  return processed;
}

const makeInsertSql = (db, table, params) => {
  const columns = Object.keys(params);
  const columnTypes = db.columnSets[table];
  const placeholders = getPlaceholders(db.supports, params, columnTypes);
  return `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
}

const processBatch = async (db, options, post) => {
  const result = await db.all(options);
  return {
    statement: result.statement,
    params: result.params,
    post: (meta) => {
      const response = result.post(meta);
      return post(response);
    }
  }
}

const processInsert = async (db, sql, params, primaryKey, tx) => {
  const options = {
    query: sql,
    params: cleanse(params),
    tx,
    write: true,
    adjusted: true
  };
  const post = (result) => result[0][primaryKey];
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const result = await db.all(options);
  return post(result);
}

const upsert = async (db, table, options, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const { values, target, set } = options;
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const params = adjust(db, table, values);
  let sql = makeInsertSql(db, table, params);
  let allParams = { ...params };
  verify(Object.keys(values));
  if (target && set) {
    verify([target]);
    verify(Object.keys(set));
    const params = adjust(db, table, set);
    const setClause = createSetClause(db, table, params);
    sql += ` on conflict(${target}) do update set ${setClause}`;
    allParams = { ...allParams, ...params };
  }
  else {
    sql += ' on conflict do nothing';
  }
  const primaryKey = db.getPrimaryKey(table);
  sql += ` returning ${primaryKey}`;
  return await processInsert(db, sql, allParams, primaryKey, tx);
}

const insert = async (db, table, params, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const columns = Object.keys(params);
  verify(columns);
  const adjusted = adjust(db, table, params);
  const sql = makeInsertSql(db, table, adjusted);
  const primaryKey = db.getPrimaryKey(table);
  const query = `${sql} returning ${primaryKey}`;
  return await processInsert(db, query, adjusted, primaryKey, tx);
}

const batchInserts = async (tx, db, table, items) => {
  const inserts = [];
  for (const item of items) {
    const adjusted = adjust(db, table, item);
    const sql = makeInsertSql(db, table, adjusted);
    inserts.push({
      query: sql,
      params: cleanse(adjusted),
      tx,
      adjusted: true
    });
  }
  if (tx && tx.isBatch) {
    return await Promise.all(inserts.map(insert => db.run(insert)));
  }
  await db.insertBatch(inserts);
}

const insertMany = async (db, table, items, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (items.length === 0) {
    return;
  }
  const columnSet = db.columnSets[table];
  const columnTypes = db.columns[table];
  const verify = makeVerify(table, columnSet);
  const sample = items[0];
  const columns = Object.keys(sample);
  verify(columns);
  const hasBlob = db.tables[table].filter(c => columns.includes(c.name)).some(c => c.type === 'blob');
  if (hasBlob) {
    return await batchInserts(tx, db, table, items);
  }
  let sql = `insert into ${table}(${columns.join(', ')}) select `;
  const select = columns.map(column => {
    if (db.supports.jsonb && columnTypes[column] === 'json') {
      return `jsonb(json_each.value ->> '${column}')`;
    }
    return `json_each.value ->> '${column}'`;
  }).join(', ');
  sql += select;
  sql += ' from json_each($items)';
  const params = {
    items: JSON.stringify(items)
  };
  const options = {
    query: sql,
    params,
    tx
  };
  return await db.run(options);
}

const toWhere = (verify, table, query, params) => {
  if (!query) {
    return {
      whereClauses: '',
      fromClauses: ''
    }
  }
  if (!params) {
    params = query;
  }
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return {
      whereClauses: '',
      fromClauses: ''
    }
  }
  const conditions = [];
  const fromClauses = [];
  for (const [column, param] of entries) {
    if (/^p_\d+$/.test(column)) {
      continue;
    }
    verify(column);
    if (param === undefined) {
      continue;
    }
    if (typeof param === 'function') {
      const result = getConditions(table, column, param, params);
      conditions.push(...result.conditions);
      fromClauses.push(...result.fromClauses);
    }
    else if (Array.isArray(param)) {
      const placeholder = getPlaceholder();
      params[placeholder] = param;
      conditions.push(`${table}.${column} in (select json_each.value from json_each($${placeholder}))`);
    }
    else if (param === null) {
      conditions.push(`${table}.${column} is null`);
    }
    else {
      const placeholder = getPlaceholder();
      params[placeholder] = param;
      conditions.push(`${table}.${column} = $${placeholder}`);
    }
  }
  return {
    whereClauses: conditions.join(' and '),
    fromClauses: fromClauses.join(', ')
  }
}

const createSetClause = (db, table, params) => {
  const statements = [];
  const columnTypes = db.columns[table];
  for (const [column, param] of Object.entries(params)) {
    const placeholder = getPlaceholder();
    params[placeholder] = param;
    if (columnTypes[column] === 'json' && db.supports.jsonb) {
      statements.push(`${column} = jsonb($${placeholder})`);
    }
    else {
      statements.push(`${column} = $${placeholder}`);
    }
  }
  return statements.join(', ');
}

const update = async (db, table, options, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const { where, set } = options;
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keys = Object.keys(set);
  verify(keys);
  const params = adjust(db, table, set);
  const setString = createSetClause(db, table, params);
  let sql = `update ${table} set ${setString}`;
  if (where) {
    sql += addClauses(verify, table, where, params);
  }
  const runOptions = {
    query: sql,
    params: cleanse(params),
    tx
  };
  return await db.run(runOptions);
}

const makeVerify = (table, columnSet) => {
  return (column, customFields) => {
    if (typeof column === 'string') {
      if (customFields && customFields.hasOwnProperty(column)) {
        return;
      }
      if (!columnSet.has(column)) {
        throw Error(`Column ${column} does not exist on table ${table}`);
      }
    }
    else {
      const columns = column;
      for (const column of columns) {
        if (customFields && customFields.hasOwnProperty(column)) {
          return;
        }
        if (!columnSet.has(column)) {
          throw Error(`Column ${column} does not exist on table ${table}`);
        }
      }
    }
  }
}

const traverse = (selector) => {
  const chain = [];
  const handler = {
    get: function(target, property) {
      chain.push(property);
      return proxy;
    }
  }
  const proxy = new Proxy([], handler);
  selector(proxy);
  const column = chain.shift();
  const path = `$.${chain.join('.')}`;
  return {
    column,
    path
  };
}

const expandStar = (db, table) => {
  if (!db.supports.jsonb || !db.hasJson[table]) {
    return '*';
  }
  const columnTypes = db.columns[table];
  const statements = [];
  for (const [column, type] of Object.entries(columnTypes)) {
    if (type === 'json') {
      statements.push(`json(${table}.${column}) as ${column}`);
    }
    else {
      statements.push(`${table}.${column}`);
    }
  }
  return statements.join(', ');
}

const toSelect = (db, table, columns, verify, params, customFields) => {
  const columnTypes = db.columns[table];
  if (columns) {
    if (typeof columns === 'string') {
      verify(columns);
      if (db.supports.jsonb && columnTypes[columns] === 'json') {
        return `json(${table}.${columns}) as ${columns}`;
      }
      return `${table}.${columns}`;
    }
    else if (Array.isArray(columns) && columns.length > 0) {
      const statements = [];
      for (const column of columns) {
        if (typeof column === 'string') {
          verify(column);
          if (db.supports.jsonb && columnTypes[columns] === 'json') {
            statements.push(`json(${table}.${columns}) as ${columns}`);
          }
          else {
            statements.push(`${table}.${column}`);
          }
        }
        else {
          const { select, as } = column;
          if (!/^[a-z][a-z0-9]*$/i.test(as)) {
            throw Error(`Invalid alias: ${as}`);
          }
          const result = traverse(select);
          verify(result.column);
          const placeholder = getPlaceholder();
          params[placeholder] = result.path;
          customFields[as] = 'any';
          statements.push(`json_extract(${table}.${result.column}, $${placeholder}) as ${as}`);
        }
      }
      return statements.join(', ');
    }
    else if (typeof columns === 'function') {
      const { column, path } = traverse(columns);
      verify(column);
      const placeholder = getPlaceholder();
      params[placeholder] = path;
      customFields['json_result'] = 'any';
      return `json_extract(${table}.${column}, $${placeholder}) as json_result`;
    }
    return expandStar(db, table);
  }
  return expandStar(db, table);
}

const toKeywords = (verify, keywords, params, customFields) => {
  let sql = '';
  if (keywords) {
    if (keywords.orderBy) {
      let orderBy = keywords.orderBy;
      verify(orderBy, customFields);
      if (Array.isArray(orderBy)) {
        orderBy = orderBy.join(', ');
      }
      sql += ` order by ${orderBy}`;
      if (keywords.desc) {
        sql += ' desc';
      }
    }
    if (keywords.limit !== undefined) {
      if (Number.isInteger(keywords.limit)) {
        const placeholder = getPlaceholder();
        params[placeholder] = keywords.limit;
        sql += ` limit $${placeholder}`;
      }
    }
    if (keywords.offset !== undefined) {
      if (Number.isInteger(keywords.offset)) {
        const placeholder = getPlaceholder();
        params[placeholder] = keywords.offset;
        sql += ` offset $${placeholder}`;
      }
    }
  }
  return sql;
}

const getVirtual = async (db, table, query, tx, keywords, select, returnValue, verify, once) => {
  if (!db.initialized) {
    await db.initialize();
  }
  let params = {};
  if (keywords && keywords.highlight) {
    const highlight = keywords.highlight;
    verify(highlight.column);
    const index = db.tables[table].map((c, i) => ({ name: c.name, index: i })).find(c => c.name === highlight.column).index - 1;
    const i = getPlaceholder();
    const s = getPlaceholder();
    const e = getPlaceholder();
    params[i] = index;
    params[s] = highlight.tags[0];
    params[e] = highlight.tags[1];
    select = `rowid as id, highlight(${table}, $${i}, $${s}, $${e}) as highlight`;
  }
  if (keywords && keywords.snippet) {
    const snippet = keywords.snippet;
    verify(snippet.column);
    const index = db.tables[table].map((c, i) => ({ name: c.name, index: i })).find(c => c.name === highlight.column).index - 1;
    const i = getPlaceholder();
    const s = getPlaceholder();
    const e = getPlaceholder();
    const tr = getPlaceholder();
    const to = getPlaceholder();
    params[i] = index;
    params[s] = snippet.tags[0];
    params[e] = snippet.tags[1];
    params[tr] = snippet.trailing;
    params[to] = snippet.tokens;
    select = `rowid as id, snippet(${table}, $${i}, $${s}, $${e}, $${tr}, $${to}) as snippet`;
  }
  let sql = `select ${select} from ${table}`;
  if (query) {
    const statements = [];
    const fromClauses = [];
    for (const [column, param] of Object.entries(query)) {
      verify(column);
      if (typeof param === 'function') {
        const result = getConditions(column, param, params);
        statements.push(...result.conditions);
        fromClauses.push(...result.fromClauses);
      }
      else {
        const placeholder = getPlaceholder();
        params[placeholder] = param;
        statements.push(`${column} match $${placeholder}`);
      }
    }
    if (fromClauses.length > 0) {
      sql += `, ${fromClauses.join(',')}`;
    }
    if (statements.length > 0) {
      sql += ` where ${statements.join(' and ')}`;
    }
  }
  if (keywords.rank) {
    sql += ' order by rank';
  }
  if (keywords.bm25) {
    sql += ` order by bm25(${table}, `;
    const values = [];
    for (const column of db.tables[table]) {
      if (column.name === 'rowid') {
        continue;
      }
      const value = keywords.bm25[column.name];
      if (typeof value === 'number') {
        values.push(value);
      }
    }
    sql += values.join(', ');
    sql += ')';
  }
  sql += toKeywords(verify, keywords, params);
  const options = {
    query: sql,
    params: cleanse(params),
    tx
  };
  const post = (results) => {
    if (once) {
      if (results.length === 0) {
        return undefined;
      }
      if (returnValue) {
        const result = results[0];
        const key = Object.keys(result)[0];
        return result[key];
      }
      return results[0];
    }
    if (results.length === 0) {
      return results;
    }
    if (returnValue) {
      const key = Object.keys(results[0])[0];
      return results.map(r => r[key]);
    }
    return results;
  }
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const results = await db.all(options);
  return post(results);
}

const exists = async (db, table, query, tx, groupKey) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (groupKey) {
    const result = await count(db, table, query, tx, groupKey);
    return result.map(r => {
      return {
        result: r.count > 0,
        groupKey: r[groupKey]
      }
    });
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `select exists(select 1 from ${table}`;
  sql += addClauses(verify, table, query);
  sql += ') as result';
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  const post = (results) => {
    if (results.length > 0) {
      return Boolean(results[0].result);
    }
    return undefined;
  }
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const results = await db.all(options);
  return post(results);
}

const addClauses = (verify, table, query, params) => {
  let sql = '';
  const { whereClauses, fromClauses } = toWhere(verify, table, query, params);
  if (fromClauses) {
    sql += `, ${fromClauses}`;
  }
  if (whereClauses) {
    sql += ` where ${whereClauses}`;
  }
  return sql;
}

const count = async (db, table, query, tx, groupKey) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (!query) {
    query = {};
  }
  if (reservedWords.some(k => query.hasOwnProperty(k))) {
    query = query.where;
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql;
  if (groupKey) {
    sql = `select count(*) as count, ${groupKey} from ${table}`;
  }
  else {
    sql = `select count(*) as count from ${table}`;
  }
  sql += addClauses(verify, table, query);
  if (groupKey) {
    sql += ` group by ${groupKey}`;
  }
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  const post = (results) => {
    if (groupKey) {
      return results;
    }
    if (results.length > 0) {
      return results[0].count;
    }
    return undefined;
  };
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const results = await db.all(options);
  return post(results);
}

const processInclude = (key, query) => {
  const tableTarget = {};
  const tableHandler = {
    get: function(target, property) {
      if (!target.table) {
        target.table = property;
        return tableProxy;
      }
      if (!target.method) {
        target.method = property;
        return (...args) => {
          target.args = args;
          return tableProxy;
        }
      }
    }
  };
  const tableProxy = new Proxy(tableTarget, tableHandler);
  const columnHandler = {
    get: function(target, property) {
      target.name = property;
      return columnProxy;
    }
  }
  const columnTarget = {};
  const columnProxy = new Proxy(columnTarget, columnHandler);
  query(tableProxy, columnProxy);
  const method = tableTarget.method;
  const runQuery = async (db, result) => {
    const singleResult = !Array.isArray(result);
    const singleInclude = ['first', 'get', 'exists', 'count'].includes(method);
    const values = singleResult ? result[columnTarget.name] : result.map(item => item[columnTarget.name]);
    let where;
    if (['get', 'many', 'exists'].includes(method) || (method === 'count' && !tableTarget.args.where)) {
      where = tableTarget.args[0];
    }
    else {
      where = tableTarget.args[0].where;
    }
    let whereKey;
    for (const [key, value] of Object.entries(where)) {
      if (value === columnProxy) {
        whereKey = key;
        where[key] = values;
        break;
      }
    }
    let returnToValues = null;
    if (['get', 'many', 'exists', 'count'].includes(method)) {
      if (tableTarget.args.length > 1) {
        const select = tableTarget.args[1];
        if (!Array.isArray(select)) {
          if (select !== whereKey) {
            returnToValues = select;
            tableTarget.args[1] = [select, whereKey];
          }
        }
        else if (!select.includes(whereKey)) {
          select.push(whereKey);
        }
      }
      if (method === 'count') {
        tableTarget.args.push(whereKey);
        returnToValues = 'count';
      }
      if (method === 'exists') {
        tableTarget.args.push(whereKey);
        returnToValues = 'result';
      }
    }
    else {
      const options = tableTarget.args[0];
      const select = options.select;
      if (select) {
        if (!Array.isArray(select) && select !== whereKey) {
          returnToValues = select;
          options.select = [select, whereKey];
        }
        else if (!select.includes(whereKey)) {
          select.push(whereKey);
        }
      }
    }
    let queryMethod = method;
    if (!singleResult && method === 'get') {
      queryMethod = 'many';
    }
    if (!singleResult && method === 'first') {
      queryMethod = 'query';
    }
    const included = await db[tableTarget.table][queryMethod](...tableTarget.args);
    if (singleResult) {
      result[key] = included;
      if (returnToValues !== null) {
        item[key] = item[key][returnToValues];
      }
    }
    else {
      for (const item of result) {
        const itemKey = item[columnTarget.name];
        item[key] = included.filter(value => value[whereKey] === itemKey);
        if (returnToValues !== null) {
          item[key] = item[key].map(v => v[returnToValues]);
        }
        if (singleInclude) {
          item[key] = item[key].at(0);
        }
      }
    }
  }
  return {
    proxyColumn: columnTarget.name,
    runQuery
  }
}

const get = async (db, table, query, columns, keywords, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (!query) {
    query = {};
  }
  if (reservedWords.some(k => query.hasOwnProperty(k))) {
    const { where, select, ...rest } = query;
    query = where || {};
    columns = select;
    keywords = rest;
  }
  const returnValue = ['string', 'function'].includes(typeof columns);
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const customFields = {};
  const select = toSelect(db, table, columns, verify, query, customFields);
  if (db.virtualSet.has(table)) {
    return await getVirtual(db, table, query, tx, keywords, selectResult, returnValue, verify, true);
  }
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  sql += addClauses(verify, table, query);
  sql += toKeywords(verify, keywords, query, customFields);
  sql += ' limit 1';
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  const post = (results) => {
    if (results.length > 0) {
      const result = results[0];
      const adjusted = {};
      const entries = Object.entries(result);
      for (const [key, value] of entries) {
        adjusted[key] = db.convertToJs(table, key, value, customFields);
      }
      if (returnValue) {
        return adjusted[entries[0][0]];
      }
      return adjusted;
    }
    return undefined;
  }
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const results = await db.all(options);
  return post(results);
}

const all = async (db, table, query, columns, first, tx, dbClient) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (!query) {
    query = {};
  }
  let included;
  let keywords;
  if (reservedWords.some(k => query.hasOwnProperty(k))) {
    const { where, select, include, ...rest } = query;
    query = where || {};
    columns = select;
    included = include;
    keywords = rest;
  }
  const returnValue = ['string', 'function'].includes(typeof columns);
  const includeResults = [];
  let columnsToRemove = [];
  if (included && !returnValue) {
    const extraColumns = new Set();
    for (const [column, query] of Object.entries(included)) {
      const result = processInclude(column, query);
      extraColumns.add(result.proxyColumn);
      includeResults.push({ column, result });
    }
    if (columns) {
      columnsToRemove = Array.from(extraColumns.values()).filter(c => !columns.includes(c));
      columns.push(...columnsToRemove);
    }
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const customFields = {};
  const select = toSelect(db, table, columns, verify, query, customFields);
  if (db.virtualSet.has(table)) {
    return await getVirtual(db, table, query, tx, keywords, select, returnValue, verify, false);
  }
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  sql += addClauses(verify, table, query);
  sql += toKeywords(verify, keywords, query, customFields);
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  const post = (rows) => {
    if (rows.length === 0) {
      if (first) {
        return undefined;
      }
      return rows;
    }
    const sample = rows[0];
    const keys = Object.keys(sample);
    const needsParsing = db.needsParsing(table, keys);
    let adjusted;
    if (needsParsing) {
      adjusted = [];
      for (const row of rows) {
        const created = {};
        for (const [key, value] of Object.entries(row)) {
          if (customFields.hasOwnProperty(key)) {
            created[key] = value;
            continue;
          }
          created[key] = db.convertToJs(table, key, value);
        }
        adjusted.push(created);
      }
    }
    else {
      adjusted = rows;
    }
    if (returnValue) {
      if (keywords && keywords.count) {
        return adjusted[0].count;
      }
      const key = keys[0];
      const mapped = adjusted.map(item => item[key]);
      if (first) {
        if (mapped.length > 0) {
          return mapped.at(0);
        }
        return undefined;
      }
      return mapped;
    }
    if (first) {
      if (adjusted.length > 0) {
        return adjusted.at(0);
      }
      return undefined;
    }
    return adjusted;
  };
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const rows = await db.all(options);
  const adjusted = post(rows);
  if (!included || !adjusted || returnValue) {
    return adjusted;
  }
  if (first) {
    const item = adjusted.at(0);
    for (const include of includeResults) {
      const { runQuery } = include.result;
      await runQuery(dbClient, item);
      if (columnsToRemove.length === 0) {
        return item;
      }
      for (const [key, value] of Object.entries(item)) {
        if (columnsToRemove.includes(key)) {
          continue;
        }
        item[key] = value;
      }
      return item;
    }
  }
  else {
    for (const include of includeResults) {
      const { runQuery } = include.result;
      await runQuery(dbClient, adjusted);
      if (columnsToRemove.length === 0) {
        return adjusted;
      }
      const mapped = [];
      for (const item of adjusted) {
        const removed = {};
        for (const [key, value] of Object.entries(item)) {
          if (columnsToRemove.includes(key)) {
            continue;
          }
          removed[key] = value;
        }
        mapped.push(removed);
      }
      return mapped;
    }
  }
}

const remove = async (db, table, query, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `delete from ${table}`;
  sql += addClauses(verify, table, query);
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  return await db.run(options);
}

export {
  insert,
  insertMany,
  update,
  upsert,
  exists,
  count,
  get,
  all,
  remove
}
