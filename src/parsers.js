const toValues = (rows) => {
  if (!rows || rows.length === 0) {
    return rows;
  }
  const sample = rows[0];
  const keys = Object.keys(sample);
  if (keys.length === 1) {
    const key = keys[0];
    return rows.map(r => r[key]);
  }
  return rows;
}

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
  parse,
  toValues
}
