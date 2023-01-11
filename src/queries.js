const insert = async (db, table, params, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const columns = Object.keys(params);
  verify(columns);
  const placeholders = columns.map(c => `$${c}`);
  const sql = `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
  const primaryKey = db.getPrimaryKey(table);
  const result = await db.all(`${sql} returning ${primaryKey}`, params, null, tx, true);
  return result[0][primaryKey];
}

const insertMany = async (db, table, items, tx) => {
  if (items.length === 0) {
    return;
  }
  const columnSet = db.columnSets[table];
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
    try {
      await tx.begin();
      const placeholders = columns.map(c => `$${c}`);
      const sql = `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
      const statement = await db.prepare(sql, tx.db);
      const promises = [];
      for (const item of items) {
        const promise = db.run(statement, item, null, tx);
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
      return;
    }
  }
  let sql = `insert into ${table}(${columns.join(', ')}) select `;
  const select = columns.map(c => `json_each.value ->> '${c}'`).join(', ');
  sql += select;
  sql += ' from json_each($items)';
  const params = {
    items: JSON.stringify(items)
  };
  await db.run(sql, params, null, tx);
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
    if (Array.isArray(param)) {
      return `${column} in (select json_each.value from json_each($${column}))`;
    }
    if (param instanceof RegExp) {
      return `${column} regexp $${column}`;
    }
    if (param === null) {
      return `${column} is null`;
    }
    return `${column} = $${column}`;
  }).join(' and ');
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

const update = async (db, table, query, params, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keys = Object.keys(params);
  verify(keys);
  const set = keys.map(param => `${param} = $${param}`).join(', ');
  let sql;
  if (query) {
    const where = toClause(query, verify);
    query = removeNulls(query);
    sql = `update ${table} set ${set} where ${where}`;
  }
  else {
    sql = `update ${table} set ${set}`;
  }
  return await db.run(sql, { ...params, ...query }, null, tx);
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
  const results = await db.all(sql, params, null, tx);
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `select exists(select 1 from ${table}`;
  const where = toClause(query, verify);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += ') as result';
  const results = await db.all(sql, query, null, tx);
  if (results.length > 0) {
    return Boolean(results[0].result);
  }
  return undefined;
}

const count = async (db, table, query, keywords, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `count(*) as count from ${table}`;
  const where = toClause(query, verify);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  const results = await db.all(sql, query, null, tx);
  if (results.length > 0) {
    return results[0].count;
  }
  return undefined;
}

const get = async (db, table, query, columns, tx) => {
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
  const where = toClause(query, verify);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const results = await db.all(sql, query, null, tx);
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
  const where = toClause(query, verify);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const rows = await db.all(sql, query, null, tx);
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
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `delete from ${table}`;
  const where = toClause(query, verify);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  return await db.run(sql, query, null, tx);
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
