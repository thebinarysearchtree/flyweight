import { blank } from './utils.js';
import { parseQuery } from './queries.js';

const subqueries = (sql, tables) => {
  const fragments = [];
  const blanked = blank(sql);
  const matches = blanked.matchAll(/\((?<query>[^)]+)\)/gmid);
  let lastEnd = 0;
  for (const match of matches) {
    const [start, end] = match.indices.groups.query;
    const query = sql.substring(start, end);
    if (/^\s*select\s/mi.test(query)) {
      const adjusted = objectStar(query, tables);
      if (adjusted !== query) {
        if (lastEnd !== start) {
          fragments.push(sql.substring(lastEnd, start));
        }
        fragments.push(adjusted);
        lastEnd = end;
      }
    }
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join('');
}

const processObjectStar = (sql, tables) => {
  const fragments = [];
  tables = { ...tables };
  const blanked = blank(sql);
  let lastEnd = 0;
  if (/^\s*with\s/mi.test(blanked)) {
    const matches = blanked.matchAll(/(\s|,)(?<tableName>[a-z0-9_]+)\s(as)\s\((?<query>[^)]+)\)/gmid);
    for (const match of matches) {
      const tableName = match.groups.tableName;
      const [start, end] = match.indices.groups.query;
      const query = sql.substring(start, end);
      const columns = parseQuery(query, tables);
      const adjusted = objectStar(query, tables);
      tables[tableName] = columns;
      if (adjusted !== query) {
        if (lastEnd !== start) {
          fragments.push(sql.substring(lastEnd, start));
        }
        fragments.push(adjusted);
        lastEnd = end;
      }
    }
    const selectMatch = /\)\s*(?<query>select\s.+$)/gmids.exec(blanked);
    const [start, end] = selectMatch.indices.groups.query;
    const query = sql.substring(start, end);
    if (start !== lastEnd) {
      fragments.push(sql.substring(lastEnd, start));
    }
    const adjusted = objectStar(query, tables);
    fragments.push(adjusted);
    return fragments.join('');
  }
  if (/^\s*select\s/mi.test(blanked)) {
    return objectStar(sql, tables);
  }
  return sql;
}

const objectStar = (sql, tables) => {
  const fragments = [];
  const blanked = blank(sql);
  const [start, end] = /^\s*select\s+(distinct\s)?(?<select>.+?)\s+from\s+.+$/gmids
    .exec(blanked)
    .indices
    .groups
    .select;
  const select = sql.substring(start, end);
  const blankedSelect = blank(select, { stringsOnly: true });
  let lastEnd = 0;
  if (/json_object\(([a-z0-9_]+\.)?\*\)/i.test(blankedSelect)) {
    const columns = parseQuery(sql, tables);
    const matches1 = Array.from(blankedSelect.matchAll(/json_object\(\s*(?<functionContent>([a-z0-9_]+\.)?\*)\s*\)\s+as\s+(?<columnName>[a-z0-9_]+)/gmid));
    const matches2 = Array.from(blankedSelect.matchAll(/json_group_array\(\s*json_object\(\s*(?<functionContent>([a-z0-9_]+\.)?\*)\s*\)\s*\)\s+as\s+(?<columnName>[a-z0-9_]+)/gmid));
    const matches = matches1.concat(matches2);
    for (const match of matches) {
      const columnName = match.groups.columnName;
      const [contentStart, contentEnd] = match.indices.groups.functionContent;
      const column = columns.find(c => c.name === columnName);
      if (lastEnd !== start + contentStart) {
        fragments.push(sql.substring(lastEnd, start + contentStart));
      }
      const expanded = [];
      for (const starColumn of column.starColumns) {
        const split = starColumn.split('.');
        const name = split.length === 1 ? split[0] : split[1];
        expanded.push(`'${name}', ${starColumn}`);
      }
      fragments.push(expanded.join(', '));
      lastEnd = start + contentEnd;
    }
  }
  fragments.push(sql.substring(lastEnd));
  let adjusted = fragments.join('');
  adjusted = subqueries(adjusted, tables);
  return adjusted;
}

const expandStar = (sql, tables) => {
  const fragments = [];
  const columns = parseQuery(sql, tables);
  const blanked = blank(sql);
  const [start, end] = /^\s*select\s+(distinct\s)?(?<select>.+?)\s+from\s+.+$/gmids
    .exec(blanked)
    .indices
    .groups
    .select;
  const select = sql.substring(start, end);
  const matches = blank(select).matchAll(/(?<statement>[^,]+)(,|$)/gmd);
  let lastEnd = 0;
  let i = 0;
  const duplicates = new Set();
  for (const match of matches) {
    const [statementStart, statementEnd] = match.indices.groups.statement;
    const statement = select.substring(statementStart, statementEnd).trim();
    if (/^([a-z0-9_]+\.)?\*$/gmi.test(statement)) {
      if (lastEnd !== start + statementStart) {
        fragments.push(sql.substring(lastEnd, start + statementStart));
      }
      lastEnd = start + statementEnd;
      const split = statement.split('.');
      let tableAlias;
      if (split.length > 1) {
        tableAlias = split[0];
      }
      const tableColumns = columns.filter(c => c.partOf === statement);
      const expanded = [];
      for (const column of tableColumns) {
        let adjusted;
        if (duplicates.has(column.name)) {
          adjusted = `flyweight${i}_${column.name}`;
          i++;
        }
        else {
          adjusted = column.name;
          duplicates.add(column.name);
        }
        const statement = tableAlias ? `${tableAlias}.${adjusted}` : adjusted;
        expanded.push(statement);
      }
      fragments.push(expanded.join(', '));
    }
    else {
      let name;
      const aliasMatch = /.+\s+as\s+(?<alias>[a-z0-9_]+)$/gmids.exec(statement);
      if (aliasMatch) {
        name = aliasMatch.groups.alias;
      }
      else {
        name = statement.split('.').at(-1);
      }
      if (duplicates.has(name)) {
        let adjusted;
        if (aliasMatch) {
          adjusted = statement.replace(/\s+as\s+[a-z0-9_]+$/gmid, '');
        }
        else {
          adjusted = statement;
        }
        adjusted += ` as flyweight${i}_${name}`;
        i++;
        if (lastEnd !== start + statementStart) {
          fragments.push(sql.substring(lastEnd, start + statementStart));
        }
        lastEnd = start + statementEnd;
        fragments.push(adjusted);
      }
      else {
        duplicates.add(name);
      }
    }
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join('');
}

const processGroups = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/(^|,|\s|\()(?<groupArray>groupArray\()/gmid);
  for (const match of matches) {
    const [start, end] = match.indices.groups.groupArray;
    if (lastEnd !== start) {
      fragments.push(sql.substring(lastEnd, start));
    }
    lastEnd = end;
    fragments.push('json_group_array(');
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join('');
}

const processArrays = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/(^|,|\s|\()(?<array>array\()/gmid);
  for (const match of matches) {
    const [start, end] = match.indices.groups.array;
    if (lastEnd !== start) {
      fragments.push(sql.substring(lastEnd, start));
    }
    lastEnd = end;
    fragments.push('json_array(');
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join('');
}

const processObjects = (sql, fragments = []) => {
  const blanked = blank(sql, { stringsOnly: true });
  const objectMatch = /(^|,|\s|\()(?<object>object\s*\()/gmid.exec(blanked);
  if (!objectMatch) {
    fragments.push(sql);
    return fragments.join('');
  }
  const columns = [];
  const [objectStart] = objectMatch.indices.groups.object;
  const processed = blank(sql.substring(objectStart));
  const processedMatch = /(^|,|\s|\()(?<object>object\s*\((?<columns>[^)]+)\))/gmid.exec(processed);
  const [start, end] = processedMatch.indices.groups.columns;
  const columnsText = sql.substring(objectStart + start, objectStart + end);
  if (/^([a-z0-9_]+\.)?\*$/i.test(columnsText)) {
    fragments.push(sql.substring(0, objectStart));
    fragments.push(`json_object(${columnsText})`);
    const objectEnd = objectStart + processedMatch.indices.groups.object[1];
    return processObjects(sql.substring(objectEnd), fragments);
  }
  const columnMatches = blank(columnsText).matchAll(/(?<column>[^,]+)(,|$)/gmid);
  for (const columnMatch of columnMatches) {
    const [columnStart, columnEnd] = columnMatch.indices.groups.column;
    let column = columnsText.substring(columnStart, columnEnd);
    while (true) {
      const processed = processObjects(column);
      if (processed === column) {
        break;
      }
      else {
        column = processed;
      }
    }
    const aliasMatch = /(?<value>^.+)\s+as\s+(?<alias>[a-z0-9_]+)\s*$/gmid.exec(blank(column));
    if (aliasMatch) {
      const [valueStart, valueEnd] = aliasMatch.indices.groups.value;
      const value = column.substring(valueStart, valueEnd).trim();
      const name = aliasMatch.groups.alias;
      columns.push({
        name,
        value
      });
    }
    else {
      const name = column.split('.').at(-1).trim();
      const value = column.trim();
      columns.push({
        name,
        value
      });
    }
  }
  fragments.push(sql.substring(0, objectStart));
  fragments.push(`json_object(${columns.map(c => `'${c.name}', ${c.value}`).join(', ')})`);
  const objectEnd = objectStart + processedMatch.indices.groups.object[1];
  return processObjects(sql.substring(objectEnd), fragments);
}

const preprocess = (sql, tables) => {
  sql = processGroups(sql);
  sql = processArrays(sql);
  sql = processObjects(sql);
  sql = expandStar(sql, tables);
  sql = processObjectStar(sql, tables);
  return sql;
}

export {
  preprocess
};
