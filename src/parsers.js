import { toValue, toValues } from './utils.js';

const parseOne = (db, row) => {
  if (!row) {
    return row;
  }
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const parser = db.getDbToJsParser(key);
    if (parser) {
      const [k, v] = parser(key, value);
      result[k] = v;
    }
    else {
      result[key] = value;
    }
  }
  return toValue(result);
}

const parseMany = (db, rows) => {
  if (rows.length === 0) {
    return rows;
  }
  const sample = rows[0];
  const parsers = {};
  let found = false;
  for (const key of Object.keys(sample)) {
    const parser = db.getDbToJsParser(key);
    if (parser) {
      parsers[key] = parser;
      found = true;
    }
  }
  if (!found) {
    return toValues(rows);
  }
  const results = [];
  for (const row of rows) {
    const adjusted = {};
    for (const [key, value] of Object.entries(row)) {
      const parser = parsers[key];
      if (parser) {
        const [k, v] = parser(key, value);
        adjusted[k] = v;
      }
      else {
        adjusted[key] = value;
      }
    }
    results.push(adjusted);
  }
  return toValues(results);
}

export {
  parseOne,
  parseMany
}
