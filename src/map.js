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

const removePrefix = (key, prefix) => {
  const without = key.substring(prefix.length);
  return without[0].toLowerCase() + without.substring(1);
}

const getParsers = (db, sample, prefixes) => {
  const keys = Object.keys(sample);
  const parsers = {};
  let found = false;
  for (const key of keys) {
    const prefix = prefixes ? Object.values(prefixes).find(p => key.startsWith(p) && key.length !== p.length) : undefined;
    let adjusted;
    if (prefix === undefined) {
      adjusted = key;
    }
    else {
      adjusted = removePrefix(key, prefix);
    }
    const parser = db.getDbToJsParser(adjusted);
    if (parser) {
      parsers[key] = parser;
      found = true;
    }
  }
  if (!found) {
    return null;
  }
  return parsers;
}

const getPrimaryKeys = (sample, skip, prefixes) => {
  const prefixValues = prefixes ? Object.values(prefixes) : null;
  const keys = Object.keys(sample);
  const primaryKeys = [];
  let i = 0;
  for (const key of keys) {
    if (key.endsWith('Id') && (!skip || !skip.includes(key))) {
      if (prefixValues) {
        if (prefixValues.some(v => key.startsWith(v))) {
          continue;
        }
      }
      primaryKeys.push({ name: key, index: i });
    }
    i++;
  }
  return primaryKeys;
}

const sliceProps = (o, start, end) => {
  const entries = Object.entries(o).slice(start, end);
  const result = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

const convertPrefixes = (o, prefixes) => {
  const entries = Object.entries(o);
  const prefixEntries = Object.entries(prefixes);
  const result = {};
  const names = Object.keys(prefixes);
  const values = Object.values(prefixes);
  for (const [name, prefix] of prefixEntries) {
    let created = {};
    let found = false;
    for (const [key, value] of entries) {
      if (key.startsWith(prefix) && !names.includes(key) && key.length !== prefix.length) {
        found = true;
        const without = removePrefix(key, prefix);
        created[without] = value;
      }
    }
    const primaryKey = Object.keys(created)[0];
    if (created[primaryKey] === null) {
      created = null;
    }
    if (found) {
      result[name] = created;
    }
  }
  let adjusted = {};
  for (const [key, value] of entries) {
    if (!values.some(v => key.startsWith(v) && v.length !== key.length)) {
      adjusted[key] = value;
    }
  }
  adjusted = { ...adjusted, ...result };
  return adjusted;
}

const parse = (o, parsers) => {
  const result = {};
  for (const [key, value] of Object.entries(o)) {
    const parser = parsers[key];
    if (parser) {
      const [k, v] = parser(key, value);
      result[k] = v;
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

const auto = (db, rows, skip, prefixes, primaryKeys, parsers, one) => {
  if (rows.length === 0) {
    return [];
  }
  if (prefixes && Array.isArray(prefixes)) {
    const result = {};
    for (const prefix of prefixes) {
      result[prefix] = prefix;
    }
    prefixes = result;
  }
  const sample = rows[0];
  if (!primaryKeys) {
    primaryKeys = getPrimaryKeys(sample, skip, prefixes);
  }
  if (parsers === undefined) {
    parsers = getParsers(db, sample, prefixes);
    if (primaryKeys.length < 2) {
      if (one) {
        let result = sample;
        if (parsers) {
          result = parse(result, parsers);
        }
        if (prefixes) {
          result = convertPrefixes(result, prefixes);
        }
        return result;
      }
      else {
        if (parsers) {
          rows = rows.map(s => parse(s, parsers));
        }
        if (prefixes) {
          rows = rows.map(s => convertPrefixes(s, prefixes));
        }
        return rows;
      }
    }
  }
  if (primaryKeys.length === 0) {
    if (parsers) {
      rows = rows.map(s => parse(s, parsers));
    }
    if (prefixes) {
      rows = rows.map(s => convertPrefixes(s, prefixes));
    }
    return rows;
  }
  const previousKey = primaryKeys[0];
  if (primaryKeys.length === 1) {
    let sliced = rows.map(r => sliceProps(r, previousKey.index));
    if (parsers) {
      sliced = sliced.map(s => parse(s, parsers));
    }
    if (prefixes) {
      sliced = sliced.map(s => convertPrefixes(s, prefixes));
    }
    return nullToArray(sliced, previousKey.name);
  }
  const nextKey = primaryKeys[1];
  const arrayName = toArrayName(nextKey.name);
  const getResults = (rows) => {
    let result = sliceProps(rows[0], previousKey.index, nextKey.index);
    if (parsers) {
      result = parse(result, parsers);
    }
    if (prefixes) {
      result = convertPrefixes(result, prefixes);
    }
    const splitRows = split(rows, nextKey.name);
    const slicedKeys = primaryKeys.slice(1);
    let mapped = splitRows.map(rows => auto(db, rows, skip, prefixes, slicedKeys, parsers, true));
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

const mapOne = (db, rows, skip, prefixes) => auto(db, rows, skip, prefixes, null, undefined, true);
const mapMany = (db, rows, skip, prefixes) => auto(db, rows, skip, prefixes, null, undefined, false);

export {
  map,
  mapOne,
  mapMany,
  getPrimaryKeys,
  convertPrefixes,
  sliceProps,
  toArrayName
}
