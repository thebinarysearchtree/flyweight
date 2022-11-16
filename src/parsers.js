import { toValues } from './utils.js';

const parse = (rows, types) => {
  if (rows.length === 0) {
    return rows;
  }
  if (!types) {
    return rows;
  }
  const needsParsing = Object.values(types).some(t => t !== null);
  if (!needsParsing) {
    return rows;
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
  parse
}
