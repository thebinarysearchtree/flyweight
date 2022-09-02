import { getDbToJsParser, getJsToDbParser } from './parsers.js';

const insert = async (db, table, params) => {
  const adjusted = {};
  for (const [key, value] of Object.entries(params)) {
    const parser = getJsToDbParser(key, value);
    if (parser) {
      const v = parser(value);
      adjusted[key] = v;
    }
    else {
      adjusted[key] = value;
    }
  }
  params = adjusted;
  const columns = Object.keys(params);
  const placeholders = columns.map(c => `$${c}`);
  const sql = `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
  if (params.id !== undefined) {
    return await db.run(sql, params);
  }
  const result = await db.get(`${sql} returning id`, params);
  if (result !== undefined) {
    return result.id;
  }
  return null;
}

const parse = (item, parsers) => {
  const result = {};
  for (const [key, value] of Object.entries(item)) {
    const parser = parsers[key];
    if (parser) {
      const v = parser(value);
      result[key] = v;
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

const insertMany = async (db, table, items) => {
  if (items.length === 0) {
    return;
  }
  const sample = items[0];
  const parsers = {};
  let found = false;
  for (const [key, value] of Object.entries(sample)) {
    const parser = getJsToDbParser(key, value);
    if (parser) {
      parsers[key] = parser;
      found = true;
    }
  }
  const columns = Object.keys(sample);
  const placeholders = columns.map(c => `$${c}`);
  const sql = `insert into ${table}(${columns.join(', ')}) values(${placeholders.join(', ')})`;
  const statement = db.prepare(sql);
  try {
    await db.begin();
    for (const item of items) {
      const parsed = found ? parse(item) : item;
      await db.run(statement, parsed);
    }
    await db.commit();
  }
  catch (e) {
    await db.rollback();
    throw e;
  }
}

const toClause = (query) => {
  if (!query) {
    return null;
  }
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return null;
  }
  return entries.map(([column, param]) => {
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

const update = async (db, table, params, query) => {
  const set = Object.keys(params).map(param => `${param} = $${param}`).join(', ');
  let sql;
  if (query) {
    const where = toClause(query);
    query = removeNulls(query);
    sql = `update ${table} set ${set} where ${where}`;
  }
  else {
    sql = `update ${table} set ${set}`;
  }
  return await db.run(sql, { ...params, ...query });
}

const toSelect = (columns, keywords, table, db) => {
  if (columns) {
    if (typeof columns === 'string') {
      return columns;
    }
    if (Array.isArray(columns) && columns.length > 0) {
      return columns.join(', ');
    }
    if (keywords && keywords.count) {
      return 'count(*) as count';
    }
    if (keywords && keywords.select) {
      const select = keywords.select;
      if (typeof select === 'string') {
        return select;
      }
      if (Array.isArray(select) && select.length > 0) {
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

const toKeywords = (keywords) => {
  let sql = '';
  if (keywords) {
    if (keywords.orderBy) {
      let orderBy = keywords.orderBy;
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

const get = async (db, table, query, columns) => {
  const keywords = columns && typeof columns !== 'string' && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords, table, db);
  const returnValue = typeof columns === 'string' || (keywords && typeof keywords.select === 'string') || (keywords && keywords.count);
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  const where = toClause(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords);
  const result = await db.get(sql, query);
  if (result) {
    const adjusted = {};
    const entries = Object.entries(result);
    for (const [key, value] of entries) {
      const parser = getDbToJsParser(key);
      if (parser) {
        const [k, v] = parser(key, value);
        adjusted[k] = v;
      }
      else {
        adjusted[key] = value;
      }
    }
    if (returnValue) {
      return entries[0][1];
    }
    return adjusted;
  }
  return result;
}

const all = async (db, table, query, columns) => {
  const keywords = columns && typeof columns !== 'string' && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords, table, db);
  const returnValue = typeof columns === 'string' || (keywords && typeof keywords.select === 'string') || (keywords && keywords.count);
  let sql = 'select ';
  if (keywords && keywords.distinct) {
    sql += 'distinct ';
  }
  sql += `${select} from ${table}`;
  const where = toClause(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords);
  const rows = await db.all(sql, query);
  if (rows.length > 0) {
    const sample = rows[0];
    const parsers = {};
    let found = false;
    const keys = Object.keys(sample);
    for (const key of keys) {
      const parser = getDbToJsParser(key);
      if (parser) {
        parsers[key] = parser;
        found = true;
      }
    }
    if (found) {
      const adjusted = [];
      for (const row of rows) {
        const created = {};
        for (const [key, value] of Object.entries(row)) {
          const parser = parsers[key];
          if (parser) {
            const [k, v] = parser(key, value);
            created[k] = v;
          }
          else {
            created[key] = value;
          }
        }
        adjusted.push(created);
      }
      if (returnValue) {
        const key = keys[0];
        return adjusted.map(item => item[key]);
      }
      return adjusted;
    }
    if (returnValue) {
      const key = keys[0];
      return rows.map(item => item[key]);
    }
    return rows;
  }
  return rows;
}

const remove = async (db, table, query) => {
  let sql = `delete from ${table}`;
  const where = toClause(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  return await db.run(sql, query);
}

export {
  insert,
  insertMany,
  update,
  get,
  all,
  remove
}
