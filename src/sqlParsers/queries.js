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
  const processed = blank(query);
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
  for (const item of statements) {
    let found = false;
    for (const parser of parsers) {
      const { pattern, extractor } = parser;
      const processed = blank(item);
      const result = pattern.exec(processed);
      if (result) {
        const parsed = extractor(result.groups);
        selectColumns.push(parsed);
        found = true;
        break;
      }
    }
    if (!found) {
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
    .replaceAll(/(\snatural\s)|(\sleft\s)|(\sright\s)|(\sfull\s)|(\sinner\s)|(\scross\s)|(\souter\s)/gm, '')
    .replaceAll(',', 'join')
    .replaceAll(/\son\s.+?\sjoin\s/gm, ' join ')
    .replaceAll(/\son\s+[^\s]+\s=\s+[^\s]+/gm, ' ')
    .split('join')
    .map(s => s.trim());
  for (const item of from) {
    const split = item.split(/\s/);
    const tableName = split[0];
    const tableAlias = split[1];
    fromTables.push({
      tableName,
      tableAlias
    });
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
          results.push({
            column: column.name,
            type: column.type
          });
        }
        continue;
      }
      else {
        const fromTable = fromTables.find(t => t.tableAlias === column.tableAlias);
        type = tables[fromTable.tableName]
          .find(c => c.name === column.columnName)
          .type;
      }
    }
    results.push({
      column: column.columnAlias || column.columnName,
      type
    });
  }
  return results;
}

export {
  parse
}
