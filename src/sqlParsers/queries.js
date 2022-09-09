import { blank } from './utils.js';
import returnTypes from './returnTypes.js';

const getTempTables = (query, fromPattern, tables) => {
  const from = fromPattern.exec(query).groups.from;
  const processed = blank(from);
  const matches = processed.matchAll(/(?<subQuery>\([^)]+\))/gm);
  const tempTables = {};
  let processedQuery = query;
  let i = 1;
  for (const match of matches) {
    const subQuery = match.groups.subQuery;
    const processed = from.substring(match.index + 1, match.index + subQuery.length - 1);
    const parsedTable = parse(processed, tables);
    const tableName = `temp${i}`;
    processedQuery = processedQuery.replace(from.substring(match.index, match.index + subQuery.length), tableName);
    const columns = parsedTable.map(c => ({ name: c.column, type: c.type }));
    tempTables[tableName] = columns;
    i++;
  }
  return {
    processedQuery,
    tempTables
  }
}

const parse = (query, tables) => {
  query = query.replaceAll(/\s+/gm, ' ');
  let processed = blank(query);
  const isCte = /^\s*with\s/mi.test(processed);
  if (isCte) {
    let lastIndex;
    const matches = processed.matchAll(/(\s|,)(?<tableName>[a-z0-9_]+)\s(as)\s(?<material>(not\s)?(materialized\s))?\((?<query>[^)]+)\)/gmi);
    for (const match of matches) {
      const tableName = match.groups.tableName;
      const material = match.groups.material ? match.groups.material : '';
      const processed = match.groups.query;
      const offset = tableName.length + material.length + 6;
      const start = match.index + offset;
      const end = start + processed.length;
      lastIndex = end + 1;
      const actual = query.substring(start, end);
      const columns = parse(actual, tables);
      tables[tableName] = columns.map(c => ({ name: c.column, type: c.type }));
    }
    query = query.substring(lastIndex);
    processed = processed.substring(lastIndex);
  }
  const select = /^\s*select\s(?<select>.+?)\sfrom\s.+$/
    .exec(processed)
    .groups
    .select
    .replaceAll(/^\s*distinct\s/gmi, '');
  const matches = select.matchAll(/,/gm);
  const statements = [];
  let lastIndex = 0;
  for (const match of matches) {
    statements.push(select.substring(lastIndex === 0 ? 0 : lastIndex + 1, match.index).trim());
    lastIndex = match.index;
  }
  statements.push(select.substring(lastIndex + 1).trim());
  const selectColumns = [];
  const parsers = [
    {
      name: 'Column pattern',
      pattern: /^((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>([a-z0-9_]+)|\*)(\s(as)\s(?<columnAlias>[a-z0-9_]+))?$/mi,
      extractor: (groups) => {
        const { tableAlias, columnName, columnAlias } = groups;
        return {
          tableAlias,
          columnName,
          columnAlias,
          type: null
        };
      }
    },
    {
      name: 'Function pattern',
      pattern: /^(?<functionName>[a-z0-9_]+)\((((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>[a-z0-9_]+)|([^)]+))\)(.*\s(as)\s(?<columnAlias>[a-z0-9_]+))?$/mi,
      extractor: (groups) => {
        const { functionName, tableAlias, columnName, columnAlias } = groups;
        const type = returnTypes[functionName] || null;
        return {
          tableAlias,
          columnName,
          columnAlias,
          type
        };
      }
    },
    {
      name: 'Literal pattern',
      pattern: /^((?<isString>'.+')|(?<isNumber>(-?(0x)?\d+)(\.\d+)?(e\d)?)|(?<isBoolean>(true)|(false))).*\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { isString, columnAlias } = groups;
        const type = isString !== undefined ? 'string' : 'number';
        return {
          tableAlias: null,
          columnName: null,
          columnAlias,
          type
        };
      }
    },
    {
      name: 'Case pattern',
      pattern: /^case when .+ then (?<then>.+(?!else)(?!when)) end as (?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { then, columnAlias } = groups;
        const columnName = then.split(/\s(else)|(when)/)[0];
        const statement = `${columnName} as ${columnAlias}`;
        console.log(statement);
        return parseColumn(statement);
      }
    },
    {
      name: 'Expression pattern',
      pattern: /^.+\s(not\s)?(\s(in \([^)]+\))|(like)|(regexp)|(exists \([^)]+\))|(is null)|(is not null)\s)(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { columnAlias } = groups;
        return {
          tableAlias: null,
          columnName: null,
          columnAlias,
          type: 'number'
        };
      }
    },
    {
      name: 'Operator pattern',
      pattern: /^.+\s(=|(!=)|(==)|(<>)|(>=)|(<=)|>|<|\*|\/|%|\+|-)\s.+\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { columnAlias } = groups;
        return {
          tableAlias: null,
          columnName: null,
          columnAlias,
          type: 'number'
        };
      }
    },
    {
      name: 'Alias pattern',
      pattern: /.+\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { columnAlias } = groups;
        return {
          tableAlias: null,
          columnName: null,
          columnAlias,
          type: null
        };
      }
    }
  ];

  const parseColumn = (statement) => {
    for (const parser of parsers) {
      const { pattern, extractor } = parser;
      const processed = blank(statement);
      const result = pattern.exec(processed);
      if (result) {
        return extractor(result.groups);
      }
    }
    return null;
  }

  for (const statement of statements) {
    const parsed = parseColumn(statement);
    if (parsed) {
      selectColumns.push(parsed);
    }
    else {
      return null;
    }
  }
  const fromTables = [];
  const fromPattern = /\sfrom\s+(?<from>(.|\s)+?)((\swhere\s)|(\sgroup\s)|(\swindow\s)|(\sorder\s)|(\slimit\s)|(\s*$))/mi;
  const { processedQuery, tempTables } = getTempTables(query, fromPattern, tables);
  tables = { ...tables, ...tempTables };
  const from = fromPattern
    .exec(processedQuery)
    .groups
    .from
    .replaceAll(/(\snatural\s)|(\sfull\s)|(\sinner\s)|(\scross\s)|(\souter\s)/gm, ' ')
    .replaceAll(',', 'join')
    .replaceAll(/\son\s.+?(\s((left\s)|(right\s))?join\s)/gm, '$1')
    .replaceAll(/\son\s+[^\s]+\s=\s+[^\s]+/gm, ' ')
    .split(/((?:(?:left\s)|(?:right\s))?join)\s/gm)
    .map(s => s.trim());
  let previousTable;
  let direction;
  for (const item of from) {
    if (direction === 'right') {
      previousTable.isOptional = true;
    }
    const match = /((?<direction>.+?)\s)?join/gmi.exec(item);
    if (match) {
      direction = match.groups.direction;
      continue;
    }
    const split = item.split(/\s/);
    const tableName = split[0];
    const tableAlias = split[1];
    const table = {
      tableName,
      tableAlias,
      isOptional: direction === 'left'
    };
    previousTable = table;
    fromTables.push(table);
  }
  const results = [];
  for (const column of selectColumns) {
    let type = null;
    if (column.type !== null) {
      type = column.type;
    }
    else if (column.columnName) {
      if (column.columnName === '*') {
        const fromTable = fromTables.find(t => t.tableAlias === column.tableAlias);
        for (const column of tables[fromTable.tableName]) {
          let type = column.type;
          if ((column.notNull === false && !column.primaryKey) || fromTable.isOptional) {
            type += ' | null';
          }
          results.push({
            column: column.name,
            type
          });
        }
        continue;
      }
      else {
        const fromTable = fromTables.find(t => t.tableAlias === column.tableAlias);
        const tableColumn = tables[fromTable.tableName].find(c => c.name === column.columnName);
        let columnType = tableColumn.type;
        if ((tableColumn.notNull === false && !tableColumn.primaryKey) || fromTable.isOptional) {
          columnType += ' | null';
        }
        type = columnType;
      }
    }
    results.push({
      name: column.columnAlias || column.columnName,
      type,
      originalName: column.columnName
    });
  }
  return results;
}

export {
  parse
}
