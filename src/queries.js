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
    return `${column} = $${column}`;
  }).join(' and ');
}

const update = async (db, table, params, query) => {
  const set = Object.keys(params).map(param => `${param} = $${param}`).join(', ');
  let sql;
  if (query) {
    const where = toClause(query);
    sql = `update ${table} set ${set} where ${where}`;
  }
  else {
    sql = `update ${table} set ${set}`;
  }
  return await db.run(sql, { ...params, ...query });
}

const toSelect = (columns, keywords) => {
  if (columns) {
    if (Array.isArray(columns) && columns.length > 0) {
      return columns.join(', ');
    }
    else if (keywords && keywords.select) {
      return keywords.select.join(', ');
    }
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
    if (keywords.skip !== undefined) {
      if (Number.isInteger(keywords.skip)) {
        sql += ` offset ${keywords.skip}`;
      }
    }
  }
  return sql;
}

const get = async (db, table, query, columns) => {
  const keywords = columns && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords);
  let sql = `select ${select} from ${table}`;
  const where = toClause(query);
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
    if (entries.length === 1) {
      return entries[0][1];
    }
    return adjusted;
  }
  return result;
}

const all = async (db, table, query, columns) => {
  const keywords = columns && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords);
  let sql = `select ${select} from ${table}`;
  const where = toClause(query);
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
      if (keys.length === 1) {
        const key = keys[0];
        return adjusted.map(item => item[key]);
      }
      return adjusted;
    }
    if (keys.length === 1) {
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
