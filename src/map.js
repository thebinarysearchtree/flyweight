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

const split = (rows, key) => {
  const results = [];
  if (rows.length === 0) {
    return rows;
  }
  let currentKey = rows[0][key];
  let currentRows = [];
  for (const row of rows) {
    const k = row[key];
    if (k === currentKey && k !== null) {
      currentRows.push(row);
    }
    else {
      results.push(currentRows);
      currentRows = [row];
      currentKey = k;
    }
  }
  results.push(currentRows);
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

const nullToArray = (rows, primaryKey) => {
  if (rows.length === 1 && rows[0][primaryKey] === null) {
    return [];
  }
  return rows;
}

const toArrayName = (primaryKey) => {
  const name = primaryKey.substring(0, primaryKey.length - 2);
  return pluralize.plural(name);
}

const auto = (db, rows, columns, types, primaryKeys, firstRun, one) => {
  if (rows.length === 0) {
    return [];
  }
  const sample = rows[0];
  if (firstRun) {
    firstRun = false;
    if (primaryKeys.length < 2) {
      if (one) {
        let result = sample;
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
  }
  if (primaryKeys.length === 0) {
    if (types) {
      rows = rows.map(s => parse(s, types));
    }
    if (columns) {
      rows = rows.map(s => renameColumns(s, columns));
    }
    return rows;
  }
  const previousKey = primaryKeys[0];
  if (primaryKeys.length === 1) {
    let sliced = rows.map(r => sliceProps(r, previousKey.index));
    if (types) {
      sliced = sliced.map(s => parse(s, types));
    }
    if (columns) {
      sliced = sliced.map(s => renameColumns(s, columns));
    }
    return nullToArray(sliced, previousKey.name);
  }
  const nextKey = primaryKeys[1];
  const arrayName = toArrayName(nextKey.name);
  const getResults = (rows) => {
    let result = sliceProps(rows[0], previousKey.index, nextKey.index);
    if (types) {
      result = parse(result, types);
    }
    if (columns) {
      result = renameColumns(result, columns);
    }
    const splitRows = split(rows, nextKey.name);
    const slicedKeys = primaryKeys.slice(1);
    let mapped = splitRows.map(rows => auto(db, rows, columns, types, slicedKeys, firstRun, true));
    if (slicedKeys.length === 1) {
      mapped = mapped.flat();
    }
    result[arrayName] = nullToArray(mapped, nextKey.name);
    return result;
  }
  if (one) {
    return getResults(rows);
  }
  return split(rows, previousKey.name).map(r => getResults(r));
}

const mapOne = (db, rows, columns, types, primaryKeys) => auto(db, rows, columns, types, primaryKeys, true, true);
const mapMany = (db, rows, columns, types, primaryKeys) => auto(db, rows, columns, types, primaryKeys, true, false);

export {
  map,
  mapOne,
  mapMany,
  renameColumns,
  sliceProps,
  toArrayName
}
