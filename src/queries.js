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

const insert = async (db, table, params, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const columns = Object.keys(params);
  verify(columns);
  const placeholders = getPlaceholders(columns, db.columns[table]);
  const adjusted = adjust(params, db.columns[table], db);
  const sql = `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
  const primaryKey = db.getPrimaryKey(table);
  const result = await db.all({
    query: `${sql} returning ${primaryKey}`,
    params: adjusted,
    tx,
    write: true,
    adjusted: true
  });
  return result[0][primaryKey];
}

const insertMany = async (db, table, items, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  if (items.length === 0) {
    return;
  }
  const columnSet = db.columnSets[table];
  const columTypes = db.columns[table];
  const verify = makeVerify(table, columnSet);
  const sample = items[0];
  const columns = Object.keys(sample);
  verify(columns);
  const hasBlob = db.tables[table].filter(c => columns.includes(c.name)).some(c => c.type === 'blob');
  if (hasBlob) {
    let createdTransaction;
    if (!tx) {
      tx = await db.getTransaction();
      createdTransaction = true;
    }
    let statement;
    try {
      await tx.begin();
      const placeholders = getPlaceholders(columns, columTypes);
      const sql = `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
      statement = await db.prepare(sql, tx.db);
      const promises = [];
      for (const item of items) {
        const adjusted = adjust(item, columTypes, db);
        const promise = db.run({
          query: statement,
          params: adjusted,
          tx,
          adjusted: true
        });
        promises.push(promise);
      }
      await Promise.all(promises);
      await tx.commit();
    }
    catch (e) {
      await tx.rollback();
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
  let sql = `insert into ${table}(${columns.join(', ')}) select `;
  const select = columns.map(column => {
    if (columTypes[column] === 'jsonb') {
      return `jsonb(json_each.value ->> '${column}')`;
    }
    return `json_each.value ->> '${column}'`;
  }).join(', ');
  sql += select;
  sql += ' from json_each($items)';
  const params = {
    items: JSON.stringify(items)
  };
  await db.run({
    query: sql,
    params,
    tx
  });
}

const toClause = (query, verify) => {
  if (!query) {
    return null;
  }
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return null;
  }
  return entries.map(([column, param]) => {
    verify(column);
    if (param instanceof Modifier) {
      const value = param.value;
      if (Array.isArray(value)) {
        return `${column} not in (select json_each.value from json_each($${column}))`;
      }
      if (value instanceof RegExp) {
        return `${column} not like $${column}`;
      }
      if (value === null) {
        return `${column} is not null`;
      }
      return `${column} ${param.operator} $${column}`;
    }
    if (Array.isArray(param)) {
      return `${column} in (select json_each.value from json_each($${column}))`;
    }
    if (param instanceof RegExp) {
      return `${column} like $${column}`;
    }
    if (param === null) {
      return `${column} is null`;
    }
    return `${column} = $${column}`;
  }).join(' and ');
}

const convertModifiers = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, param] of Object.entries(query)) {
    if (param instanceof Modifier) {
      result[key] = param.value;
    }
    else {
      result[key] = param;
    }
  }
  return result;
}

const removeNulls = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== null) {
      result[key] = value;
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

const update = async (db, table, query, params, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keys = Object.keys(params);
  verify(keys);
  const set = keys.map(param => `${param} = $${param}`).join(', ');
  let sql;
  if (query) {
    query = removeUndefined(query);
    const where = toClause(query, verify);
    query = convertModifiers(query);
    query = removeNulls(query);
    sql = `update ${table} set ${set} where ${where}`;
  }
  else {
    sql = `update ${table} set ${set}`;
  }
  return await db.run({
    query: sql,
    params: { ...params, ...query },
    tx
  });
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
    if (keywords && keywords.select) {
      const select = keywords.select;
      if (typeof select === 'string') {
        verify(select);
        return select;
      }
      if (Array.isArray(select) && select.length > 0) {
        verify(select);
        return select.join(', ');
      }
      return '*';
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
  else {
    return '*';
  }
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
  const results = await db.all({
    query: sql,
    params,
    tx
  });
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

const exists = async (db, table, query, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `select exists(select 1 from ${table}`;
  query = removeUndefined(query);
  const where = toClause(query, verify);
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += ') as result';
  const results = await db.all({
    query: sql,
    params: { ...query },
    tx
  });
  if (results.length > 0) {
    return Boolean(results[0].result);
  }
  return undefined;
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
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  const results = await db.all({
    query: sql,
    params: { ...query },
    tx
  });
  if (results.length > 0) {
    return results[0].count;
  }
  return undefined;
}

const get = async (db, table, query, columns, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keywords = columns && typeof columns !== 'string' && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords, table, db, verify);
  const returnValue = typeof columns === 'string' || (keywords && typeof keywords.select === 'string');
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
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const results = await db.all({
    query: sql,
    params: { ...query },
    tx
  });
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

const all = async (db, table, query, columns, tx) => {
  if (!db.initialized) {
    await db.initialize();
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keywords = columns && typeof columns !== 'string' && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords, table, db, verify);
  const returnValue = typeof columns === 'string' || (keywords && typeof keywords.select === 'string') || (keywords && keywords.count);
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
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const rows = await db.all({
    query: sql,
    params: { ...query },
    tx
  });
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
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  return await db.run({
    query: sql,
    params: { ...query },
    tx
  });
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
