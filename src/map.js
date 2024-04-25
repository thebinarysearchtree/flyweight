import pluralize from 'pluralize';

const map = (rows, itemSelector, keySelector) => {
  const results = [];
  if (rows.length === 0) {
    return results;
  }
  let previousKey;
  for (const row of rows) {
    const key = keySelector(row);
    if (previousKey === undefined || key !== previousKey) {
      const result = itemSelector(row);
      results.push(result);
      previousKey = key;
    }
  }
  return results;
}

const sliceProps = (o, start, end) => {
  const entries = Object.entries(o).slice(start, end);
  const result = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

const renameColumns = (o, columns) => {
  const result = {};
  for (const [key, value] of Object.entries(o)) {
    const column = columns[key];
    if (column) {
      result[column] = value;
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

const parse = (o, types) => {
  const result = {};
  for (const [key, value] of Object.entries(o)) {
    const parser = types[key];
    if (parser) {
      result[key] = parser(value);
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

const toArrayName = (primaryKey) => {
  const name = primaryKey.name;
  if (/^.+Id$/.test(name)) {
    const arrayName = name.substring(0, name.length - 2);
    return pluralize.plural(arrayName);
  }
  return primaryKey.table;
}

const auto = (db, rows, columns, types, one) => {
  if (rows.length === 0) {
    return [];
  }
  if (one) {
    let result = rows[0];
    if (types) {
      result = parse(result, types);
    }
    if (columns) {
      result = renameColumns(result, columns);
    }
    return result;
  }
  else {
    if (types) {
      rows = rows.map(s => parse(s, types));
    }
    if (columns) {
      rows = rows.map(s => renameColumns(s, columns));
    }
    return rows;
  }
}

const mapOne = (db, rows, columns, types) => auto(db, rows, columns, types, true);
const mapMany = (db, rows, columns, types) => auto(db, rows, columns, types, false);

export {
  map,
  mapOne,
  mapMany,
  renameColumns,
  sliceProps,
  toArrayName
}
