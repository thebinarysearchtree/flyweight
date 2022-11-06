import { blank } from './utils.js';
import { parseQuery } from './queries.js';

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
  return sql;
}

export {
  preprocess
};
