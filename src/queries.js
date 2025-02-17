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

const getConditions = (column, query, params) => {
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
  const selector = path ? `json_extract(${column}, $${placeholder})` : column;
  const conditions = [];
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
    const placeholder = getPlaceholder();
    params[placeholder] = value;
    conditions.push(`${selector} = $${placeholder}`);
  }
  else {
    const placeholder = getPlaceholder();
    params[placeholder] = value;
    const operator = methods.get(method);
    conditions.push(`${selector} ${operator} $${placeholder}`);
  }
  return conditions;
}

const getPlaceholders = (supports, columnNames, columnTypes) => {
  return columnNames.map(columnName => {
    if (supports.jsonb && columnTypes[columnName] === 'json') {
      return `jsonb($${columnName})`;
    }
    return `$${columnName}`;
  });
}

const adjust = (params, columnTypes, db) => {
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

const makeInsertSql = (supports, columns, columnTypes, table) => {
  const placeholders = getPlaceholders(supports, columns, columnTypes);
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

const insert = async (db, table, params, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const columns = Object.keys(params);
  verify(columns);
  const adjusted = adjust(params, db.columns[table], db);
  const sql = makeInsertSql(db.supports, columns, db.columns[table], table);
  const primaryKey = db.getPrimaryKey(table);
  const options = {
    query: `${sql} returning ${primaryKey}`,
    params: adjusted,
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

const batchInserts = async (tx, db, table, columns, columnTypes, items) => {
  const sql = makeInsertSql(db.supports, columns, columnTypes, table);
  const inserts = [];
  for (const item of items) {
    const adjusted = adjust(item, columnTypes, db);
    inserts.push({
      query: sql,
      params: adjusted,
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
    return await batchInserts(tx, db, table, columns, columnTypes, items);
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

const toWhere = (verify, query, params) => {
  if (!query) {
    return null;
  }
  if (!params) {
    params = query;
  }
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return null;
  }
  const conditions = [];
  for (const [column, param] of entries) {
    if (/^p_\d+$/.test(column)) {
      continue;
    }
    verify(column);
    if (param === undefined) {
      continue;
    }
    if (typeof param === 'function') {
      const other = getConditions(column, param, params);
      conditions.push(...other);
    }
    else if (Array.isArray(param)) {
      const placeholder = getPlaceholder();
      params[placeholder] = param;
      conditions.push(`${column} in (select json_each.value from json_each($${placeholder}))`);
    }
    else if (param === null) {
      conditions.push(`${column} is null`);
    }
    else {
      const placeholder = getPlaceholder();
      params[placeholder] = param;
      conditions.push(`${column} = $${placeholder}`);
    }
  }
  return conditions.join(' and ');
}

const update = async (db, table, query, params, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keys = Object.keys(params);
  verify(keys);
  const statements = [];
  for (const [column, param] of Object.entries(params)) {
    const placeholder = getPlaceholder();
    params[placeholder] = param;
    statements.push(`${column} = $${placeholder}`);
  }
  const set = statements.join(', ');
  let sql = `update ${table} set ${set}`;
  if (query) {
    const where = toWhere(verify, query, params);
    if (where) {
      sql += ` where ${where}`;
    }
  }
  const options = {
    query: sql,
    params: cleanse(params),
    tx
  };
  return await db.run(options);
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
      statements.push(`json(${column}) as ${column}`);
    }
    else {
      statements.push(column);
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
        return `json(${columns}) as ${columns}`;
      }
      return columns;
    }
    else if (Array.isArray(columns) && columns.length > 0) {
      const statements = [];
      for (const column of columns) {
        if (typeof column === 'string') {
          verify(column);
          if (db.supports.jsonb && columnTypes[columns] === 'json') {
            statements.push(`json(${columns}) as ${columns}`);
          }
          statements.push(column);
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
          statements.push(`json_extract(${result.column}, $${placeholder}) as ${as}`);
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
      return `json_extract(${column}, $${placeholder}) as json_result`;
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
    for (const [column, param] of Object.entries(query)) {
      verify(column);
      if (typeof param === 'function') {
        const conditions = getConditions(column, param, params);
        statements.push(...conditions);
      }
      else {
        const placeholder = getPlaceholder();
        params[placeholder] = param;
        statements.push(`${column} match $${placeholder}`);
      }
    }
    sql += ` where ${statements.join(' and ')}`;
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

const exists = async (db, table, query, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `select exists(select 1 from ${table}`;
  const result = toWhere(verify, query);
  const where = result.conditions;
  query = adjustWhere(query, result.params);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += ') as result';
  const options = {
    query: sql,
    params: { ...query },
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

const count = async (db, table, query, keywords, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (!query) {
    query = {};
  }
  if (reservedWords.some(k => query.hasOwnProperty(k))) {
    const { where, ...rest } = query;
    query = where;
    keywords = rest;
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `count(*) as count from ${table}`;
  const where = toWhere(verify, query);
  if (where) {
    sql += ` where ${where}`;
  }
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  const post = (results) => {
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const customFields = {};
  const select = toSelect(db, table, columns, verify, query, customFields);
  const returnValue = ['string', 'function'].includes(typeof columns) || (keywords && keywords.count);
  if (db.virtualSet.has(table)) {
    return await getVirtual(db, table, query, tx, keywords, selectResult, returnValue, verify, true);
  }
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  const where = toWhere(verify, query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(verify, keywords, query, customFields);
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

const all = async (db, table, query, columns, keywords, tx) => {
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const customFields = {};
  const select = toSelect(db, table, columns, verify, query, customFields);
  const returnValue = ['string', 'function'].includes(typeof columns) || (keywords && keywords.count);
  if (db.virtualSet.has(table)) {
    return await getVirtual(db, table, query, tx, keywords, select, returnValue, verify, false);
  }
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  const where = toWhere(verify, query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(verify, keywords, query, customFields);
  const options = {
    query: sql,
    params: cleanse(query),
    tx
  };
  const post = (rows) => {
    if (rows.length === 0) {
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
      return adjusted.map(item => item[key]);
    }
    return adjusted;
  };
  if (tx && tx.isBatch) {
    return await processBatch(db, options, post);
  }
  const rows = await db.all(options);
  return post(rows);
}

const remove = async (db, table, query, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `delete from ${table}`;
  const where = toWhere(verify, query);
  if (where) {
    sql += ` where ${where}`;
  }
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
  exists,
  count,
  get,
  all,
  remove
}
