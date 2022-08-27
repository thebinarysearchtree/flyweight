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

const update = async (db, table, params, query) => {
  const set = Object.keys(params).map(param => `${param} = $${param}`).join(', ');
  let sql;
  if (query) {
    const where = Object.keys(query).map(c => `${c} = $${c}`).join(' and ');
    sql = `update ${table} set ${set} where ${where}`;
  }
  else {
    sql = `update ${table} set ${set}`;
  }
  return await db.run(sql, { ...params, ...query });
}

const get = async (db, table, query, columns) => {
  const select = columns && columns.length > 0 ? columns.join(', ') : '*';
  const where = Object.keys(query).map(c => `${c} = $${c}`).join(' and ');
  const sql = `select ${select} from ${table} where ${where}`;
  const result = await db.get(sql, query);
  if (result) {
    const adjusted = {};
    for (const [key, value] of Object.entries(result)) {
      const parser = getDbToJsParser(key);
      if (parser) {
        const [k, v] = parser(key, value);
        adjusted[k] = v;
      }
      else {
        adjusted[key] = value;
      }
    }
    return adjusted;
  }
  return result;
}

const all = async (db, table, query, columns) => {
  const where = Object.keys(query).map(c => `${c} = $${c}`).join(' and ');
  const select = columns && columns.length > 0 ? columns.join(', ') : '*';
  const sql = `select ${select} from ${table} where ${where}`;
  const rows = await db.all(sql, query);
  if (rows.length > 0) {
    const sample = rows[0];
    const parsers = {};
    let found = false;
    for (const key of Object.keys(sample)) {
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
      return adjusted;
    }
    return rows;
  }
  return rows;
}

const remove = async (db, table, query) => {
  const where = Object.keys(query).map(c => `${c} = $${c}`).join(' and ');
  const sql = `delete from ${table} where ${where}`;
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
