import { toValue, toValues } from './utils.js';

const parseOne = (row, types) => {
  if (!row) {
    return row;
  }
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const parser = types[key];
    if (parser) {
      result[key] = parser(value);
    }
    else {
      result[key] = value;
    }
  }
  return toValue(result);
}

const parseMany = (rows, types) => {
  if (rows.length === 0) {
    return rows;
  }
  const needsParsing = Object.values(types).some(t => t !== null);
  if (!needsParsing) {
    return toValues(rows);
  }
  const results = [];
  for (const row of rows) {
    const adjusted = {};
    for (const [key, value] of Object.entries(row)) {
      const parser = types[key];
      if (parser) {
        adjusted[key] = parser(value);
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
