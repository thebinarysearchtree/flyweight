import { Modifier } from './modifiers.js';

const getPlaceholders = (columnNames, columnTypes) => {
  return columnNames.map(columnName => {
    if (columnTypes[columnName] === 'jsonb') {
      return `jsonb($${columnName})`;
    }
    return `$${columnName}`;
  });
}

const adjust = (params, columnTypes, db) => {
  const adjusted = db.adjust(params);
  const processed = {};
  for (const [name, value] of Object.entries(adjusted)) {
    if (columnTypes[name] === 'jsonb') {
      processed[name] = JSON.stringify(value);
    }
    else {
      processed[name] = value;
    }
  }
  return processed;
}

const makeInsertSql = (columns, columnTypes, table) => {
  const placeholders = getPlaceholders(columns, columnTypes);
  return `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
}

const processBatch = async (db, options, post) => {
  const result = await db.all(options);
  return {
    statement: result.statement,
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
  const sql = makeInsertSql(columns, db.columns[table], table);
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

const batchInserts = async (tx, db, columns, columnTypes, items) => {
  const sql = makeInsertSql(columns, columnTypes, table);
  const promises = [];
  for (const item of items) {
    const adjusted = adjust(item, columnTypes, db);
    const promise = db.run({
      query: sql,
      params: adjusted,
      tx,
      adjusted: true
    });
    promises.push(promise);
  }
  const statements = await Promise.all(promises);
  if (tx && tx.isBatch) {
    return statements;
  }
  await db.raw.batch(statements);
}

const many = async (tx, db, columns, columnTypes, items) => {
  let createdTransaction;
  if (!tx) {
    tx = await db.getTransaction();
    createdTransaction = true;
  }
  let statement;
  try {
    if (createdTransaction) {
      await tx.begin();
    }
    const sql = makeInsertSql(columns, columnTypes, table);
    statement = await db.prepare(sql, tx.db);
    const promises = [];
    for (const item of items) {
      const adjusted = adjust(item, columnTypes, db);
      const promise = db.run({
        query: statement,
        params: adjusted,
        tx,
        adjusted: true
      });
      promises.push(promise);
    }
    await Promise.all(promises);
    if (createdTransaction) {
      await tx.commit();
    }
  }
  catch (e) {
    if (createdTransaction) {
      await tx.rollback();
    }
    throw e;
  }
  finally {
    if (createdTransaction) {
      db.release(tx);
    }
    await db.finalize(statement);
    return;
  }
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
    if (!db.d1) {
      return await many(tx, db, columns, columnTypes, items);
    }
    else {
      return await batchInserts(tx, db, columns, columnTypes, items);
    }
  }
  let sql = `insert into ${table}(${columns.join(', ')}) select `;
  const select = columns.map(column => {
    if (columnTypes[column] === 'jsonb') {
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

const toClause = (query, verify) => {
  if (!query) {
    return null;
  }
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return null;
  }
  const conditions = [];
  for (const [column, param] of entries) {
    verify(column);
    if (param instanceof Modifier) {
      for (const condition of param.conditions) {
        const { name, operator, value } = condition;
        if (Array.isArray(value)) {
          conditions.push(`${column} not in (select json_each.value from json_each($where_${name}_${column}))`);
        }
        else if (value === null) {
          conditions.push(`${column} is not null`);
        }
        else {
          conditions.push(`${column} ${operator} $where_${name}_${column}`);
        }
      }
    }
    else if (Array.isArray(param)) {
      conditions.push(`${column} in (select json_each.value from json_each($where_${column}))`);
    }
    else if (param === null) {
      conditions.push(`${column} is null`);
    }
    else {
      conditions.push(`${column} = $where_${column}`);
    }
  }
  return conditions.join(' and ');
}

const adjustWhere = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, param] of Object.entries(query)) {
    if (param instanceof Modifier) {
      for (const condition of param.conditions) {
        const adjusted = `where_${condition.name}_${key}`;
        result[adjusted] = condition.value;
      }
    }
    else if (param !== null) {
      const adjusted = `where_${key}`;
      result[adjusted] = param;
    }
  }
  return result;
}

const removeUndefined = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

const rename = (params, prefix) => {
  const results = {};
  for (const [key, value] of Object.entries(params)) {
    const adjusted = `${prefix}_${key}`;
    results[adjusted] = value;
  }
  return results;
}

const update = async (db, table, query, params, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keys = Object.keys(params);
  verify(keys);
  const set = keys.map(param => `${param} = $set_${param}`).join(', ');
  params = rename(params, 'set');
  let sql;
  if (query) {
    query = removeUndefined(query);
    const where = toClause(query, verify);
    query = adjustWhere(query);
    sql = `update ${table} set ${set} where ${where}`;
  }
  else {
    sql = `update ${table} set ${set}`;
  }
  const options = {
    query: sql,
    params: { ...params, ...query },
    tx
  };
  return await db.run(options);
}

const makeVerify = (table, columnSet) => {
  return (column) => {
    if (typeof column === 'string') {
      if (!columnSet.has(column)) {
        throw Error(`Column ${column} does not exist on table ${table}`);
      }
    }
    else {
      const columns = column;
      for (const column of columns) {
        if (!columnSet.has(column)) {
          throw Error(`Column ${column} does not exist on table ${table}`);
        }
      }
    }
  }
}

const toSelect = (columns, keywords, table, db, verify) => {
  if (columns) {
    if (typeof columns === 'string') {
      verify(columns);
      return columns;
    }
    if (Array.isArray(columns) && columns.length > 0) {
      verify(columns);
      return columns.join(', ');
    }
    if (keywords && keywords.exclude) {
      if (!db.tables[table]) {
        throw Error('Database tables must be set before using exclude');
      }
      return db.tables[table]
        .map(c => c.name)
        .filter(c => !keywords.exclude.includes(c))
        .join(', ');
    }
    return '*';
  }
  return '*';
}

const toKeywords = (keywords, verify) => {
  let sql = '';
  if (keywords) {
    if (keywords.orderBy) {
      let orderBy = keywords.orderBy;
      verify(orderBy);
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
        sql += ` limit ${keywords.limit}`;
      }
    }
    if (keywords.offset !== undefined) {
      if (Number.isInteger(keywords.offset)) {
        sql += ` offset ${keywords.offset}`;
      }
    }
  }
  return sql;
}

const getVirtual = async (db, table, query, tx, keywords, select, returnValue, verify, once) => {
  if (!db.initialized) {
    await db.initialize();
  }
  let params;
  if (keywords && keywords.highlight) {
    const highlight = keywords.highlight;
    verify(highlight.column);
    const index = db.tables[table].map((c, i) => ({ name: c.name, index: i })).find(c => c.name === highlight.column).index - 1;
    params = {
      index,
      startTag: highlight.tags[0],
      endTag: highlight.tags[1]
    }
    select = `rowid as id, highlight(${table}, $index, $startTag, $endTag) as highlight`;
  }
  if (keywords && keywords.snippet) {
    const snippet = keywords.snippet;
    verify(snippet.column);
    const index = db.tables[table].map((c, i) => ({ name: c.name, index: i })).find(c => c.name === highlight.column).index - 1;
    params = {
      index,
      startTag: snippet.tags[0],
      endTag: snippet.tags[1],
      trailing: snippet.trailing,
      tokens: snippet.tokens
    }
    select = `rowid as id, snippet(${table}, $index, $startTag, $endTag, $trailing, $tokens) as snippet`;
  }
  let sql = `select ${select} from ${table}`;
  if (query) {
    params = { ...params, ...query };
    const statements = [];
    for (const column of Object.keys(query)) {
      verify(column);
      statements.push(`${column} match $${column}`);
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
  sql += toKeywords(keywords, verify);
  const options = {
    query: sql,
    params,
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
  query = removeUndefined(query);
  const where = toClause(query, verify);
  query = adjustWhere(query);
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `count(*) as count from ${table}`;
  query = removeUndefined(query);
  const where = toClause(query, verify);
  query = adjustWhere(query);
  if (where) {
    sql += ` where ${where}`;
  }
  const options = {
    query: sql,
    params: { ...query },
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const select = toSelect(columns, keywords, table, db, verify);
  const returnValue = typeof columns === 'string' || (keywords && keywords.count);
  if (db.virtualSet.has(table)) {
    return await getVirtual(db, table, query, tx, keywords, select, returnValue, verify, true);
  }
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  query = removeUndefined(query);
  const where = toClause(query, verify);
  query = adjustWhere(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const options = {
    query: sql,
    params: { ...query },
    tx
  };
  const post = (results) => {
    if (results.length > 0) {
      const result = results[0];
      const adjusted = {};
      const entries = Object.entries(result);
      for (const [key, value] of entries) {
        adjusted[key] = db.convertToJs(table, key, value);
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const select = toSelect(columns, keywords, table, db, verify);
  const returnValue = typeof columns === 'string' || (keywords && keywords.count);
  if (db.virtualSet.has(table)) {
    return await getVirtual(db, table, query, tx, keywords, select, returnValue, verify, false);
  }
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  query = removeUndefined(query);
  const where = toClause(query, verify);
  query = adjustWhere(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const options = {
    query: sql,
    params: { ...query },
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
  query = removeUndefined(query);
  const where = toClause(query, verify);
  query = adjustWhere(query);
  if (where) {
    sql += ` where ${where}`;
  }
  const options = {
    query: sql,
    params: { ...query },
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
