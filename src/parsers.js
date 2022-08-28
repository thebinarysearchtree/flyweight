import { toValue, toValues } from './utils.js';

const parsers = [];

const registerParser = (parser) => {
  parsers.push(parser);
}

const getDbToJsParser = (key) => {
  const dbToJsParsers = parsers.filter(p => p.dbToJs);
  for (const parser of dbToJsParsers) {
    const { pattern, dbToJs, trim, dbPattern } = parser;
    if ((pattern && pattern.test(key) || (dbPattern && dbPattern.test(key)))) {
      const parse = (key, value) => {
        const parsedKey = trim ? key.substring(0, key.length - trim.length) : key;
        const parsedValue = dbToJs(value);
        return [parsedKey, parsedValue];
      }
      return parse;
    }
  }
  return null;
}

const getJsToDbParser = (key, value) => {
  const jsToDbParsers = parsers.filter(p => p.jsToDb);
  for (const parser of jsToDbParsers) {
    const { pattern, jsToDb, valueTest, jsPattern } = parser;
    if ((pattern && pattern.test(key)) || (jsPattern && jsPattern.test(key)) || (valueTest && valueTest(value))) {
      return jsToDb;
    }
  }
  return null;
}

const parseOne = (row) => {
  if (!row) {
    return row;
  }
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const parser = getDbToJsParser(key);
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

const parseMany = (rows) => {
  if (rows.length === 0) {
    return rows;
  }
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
  registerParser,
  getDbToJsParser,
  getJsToDbParser,
  parseOne,
  parseMany
}
