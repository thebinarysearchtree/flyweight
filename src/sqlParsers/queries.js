import { blank } from './utils.js';
import { returnTypes, notNullFunctions } from './returnTypes.js';

const isNumber = (s) => /^((-|\+)?(0x)?\d+)(\.\d+)?(e\d)?$/.test(s);

const getTempTables = (query, fromPattern, tables) => {
  const blanked = blank(query);
  const [start, end] = fromPattern.exec(blanked).indices.groups.from;
  const from = query.substring(start, end);
  const processed = blank(from);
  const matches = processed.matchAll(/(?<subQuery>\([^)]+\))/gm);
  const tempTables = {};
  let processedQuery = query;
  let i = 1;
  for (const match of matches) {
    const subQuery = match.groups.subQuery;
    const processed = from.substring(match.index + 1, match.index + subQuery.length - 1);
    const parsedTable = parseSelect(processed, tables);
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

const getQueryType = (query) => {
  if (/^\s*select /gmi.test(query)) {
    return 'select';
  }
  if (/^\s*insert into /gmi.test(query)) {
    return 'insert';
  }
  if (/^\s*update /gmi.test(query)) {
    return 'update';
  }
  if (/^\s*delete from /gmi.test(query)) {
    return 'delete';
  }
  if (/^\s*with /gmi.test(query)) {
    return 'cte';
  }
  if (/^\s*pragma /gmi.test(query)) {
    return 'pragma';
  }
  return null;
}

const parseQuery = (sql, tables) => {
  sql = sql.replaceAll(/\s+/gm, ' ');
  const queryType = getQueryType(sql);
  if (queryType === 'select' || queryType === 'cte') {
    return parseSelect(sql, tables);
  }
  return parseWrite(sql, tables);
}

const getSelectColumns = (select, tables) => {
  const matches = blank(select).matchAll(/(?<statement>[^,]+)(,|$)/gmd);
  const statements = [];
  for (const match of matches) {
    const [start, end] = match.indices.groups.statement;
    const statement = select.substring(start, end).trim();
    statements.push(statement);
  }
  const selectColumns = [];
  const parsers = [
    {
      name: 'Literal pattern',
      pattern: /^((?<isString>'.+')|(?<isNumber>((-|\+)?(0x)?\d+)(\.\d+)?(e\d)?)|(?<isBoolean>(true)|(false)))\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { isString, isNumber, isBoolean, columnAlias } = groups;
        let type;
        if (isString !== undefined) {
          type = 'text';
        }
        else if (isNumber !== undefined) {
          if (isNumber.includes('.')) {
            type = 'real';
          }
          else {
            type = 'integer';
          }
        }
        else if (isBoolean !== undefined) {
          type = 'boolean';
        }
        return {
          columnAlias,
          type
        };
      }
    },
    {
      name: 'Column pattern',
      pattern: /^((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>([a-z0-9_]+)|\*)(\s(as)\s(?<columnAlias>[a-z0-9_]+))?$/mi,
      extractor: (groups) => {
        const { tableAlias, columnName, columnAlias } = groups;
        return {
          tableAlias,
          columnName,
          columnAlias,
          rename: true
        };
      }
    },
    {
      name: 'Cast pattern',
      pattern: /^cast\(.+? as (?<type>[a-z0-9_]+)\) as (?<columnAlias>[a-z0-9_]+)$/mi,
      pre: (statement) => blank(statement, { stringsOnly: true }),
      extractor: (groups) => {
        const { type, columnAlias } = groups;
        let dbType;
        if (type === 'none') {
          dbType = 'blob';
        }
        else if (type === 'numeric') {
          dbType = 'integer';
        }
        else {
          dbType = type;
        }
        return {
          columnAlias,
          type: dbType
        }
      }
    },
    {
      name: 'Function pattern',
      pattern: /^(?<functionName>[a-z0-9_]+)\((((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>[a-z0-9_]+)|([^)]+))\)(.*\s(as)\s(?<columnAlias>[a-z0-9_]+))?$/mi,
      pre: (statement) => blank(statement, { stringsOnly: true }),
      extractor: (groups) => {
        const { functionName, tableAlias, columnName, columnAlias } = groups;
        const type = returnTypes[functionName] || null;
        if (columnName !== undefined && isNumber(columnName)) {
          return {
            tableAlias,
            type,
            functionName
          }
        }
        return {
          tableAlias,
          columnName,
          columnAlias,
          type,
          functionName
        };
      }
    },
    {
      name: 'Select pattern',
      pattern: /^\s*\(\s*(?<select>select\s.+)\)\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      pre: (statement) => blank(statement, { stringsOnly: true }),
      extractor: (groups) => {
        const { select, columnAlias } = groups;
        const columns = parseQuery(select, tables);
        const column = columns[0];
        column.column = columnAlias;
        column.rename = false;
        column.primaryKey = false;
        column.foreign = false;
        return { column };
      }
    },
    {
      name: 'Operator pattern',
      pattern: /^.+\s((?<logical>=|(!=)|(==)|(<>)|(>=)|(<=)|>|<)|(?<maths>\*|\/|%|\+|-))\s.+\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { columnAlias, logical } = groups;
        let type;
        if (logical !== undefined) {
          type = 'boolean';
        }
        else {
          type = 'integer';
        }
        return {
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
        return parseColumn(statement);
      }
    },
    {
      name: 'Expression pattern',
      pattern: /^.+ (not )?((in \([^)]+\))|(like)|(regexp)|(exists \([^)]+\))|(is null)|(is not null)|(is true)|(is false)) as (?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { columnAlias } = groups;
        return {
          tableAlias: null,
          columnName: null,
          columnAlias,
          type: 'boolean'
        };
      }
    },
    {
      name: 'Alias pattern',
      pattern: /.+\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
      extractor: (groups) => {
        const { columnAlias } = groups;
        return {
          columnAlias
        };
      }
    }
  ];

  const parseColumn = (statement) => {
    for (const parser of parsers) {
      const { pattern, extractor, pre } = parser;
      let processed;
      if (pre) {
        processed = pre(statement);
      }
      else {
        processed = blank(statement);
      }
      const result = pattern.exec(processed);
      if (result) {
        return extractor(result.groups);
      }
    }
    return null;
  }

  for (const statement of statements) {
    const parsed = parseColumn(statement);
    selectColumns.push(parsed);
  }
  return selectColumns;
}

const getWhereColumns = (query) => {
  const blanked = blank(query);
  const match = blanked.match(/ where (?<where>.+?)(( group )|( window )|( order )|( limit )|$)/mi);
  if (!match) {
    return [];
  }
  const where = match.groups.where;
  if (/ or /gmi.test(where)) {
    return [];
  }
  const matches = where.matchAll(/(?<column>[a-z0-9_.]+) is not null/gmi);
  return Array.from(matches).map(match => {
    const column = match.groups.column;
    const split = column.split('.');
    if (split.length === 1) {
      return { columnName: column };
    }
    return {
      tableAlias: split[0],
      columnName: split[1]
    }
  });
}

const parseWrite = (query, tables) => {
  const blanked = blank(query);
  const tableMatch = blanked.match(/^\s*(insert into )|(update )|(delete from )(?<tableName>[a-z0-9_]+)/gmi);
  const returningMatch = blanked.match(/ returning (?<columns>.+)$/gmi);
  if (!returningMatch) {
    return [];
  }
  const selectColumns = getSelectColumns(returningMatch.groups.columns, tables);
  const tableName = tableMatch.groups.tableName;
  const table = tables[tableName];
  if (selectColumns.length === 1 && selectColumns[0].columnName === '*') {
    return table.columns.map(c => ({
      column: c.name,
      type: c.type,
      originalName: c.name,
      tableName,
      primaryKey: c.primaryKey,
      foreign: c.foreign,
      notNull: c.notNull || c.primaryKey
    }));
  }
  return selectColumns.map(column => {
    const tableColumn = table.columns.find(c => c.name === column.columnName);
    return {
      column: column.columnAlias || column.columnName,
      type: column.type || tableColumn.type,
      originalName: column.columnName,
      tableName,
      primaryKey: column.primaryKey,
      foreign: column.foreign,
      notNull: tableColumn.notNull || tableColumn.primaryKey
    }
  });
}

const parseSelect = (query, tables) => {
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
      const columns = parseQuery(actual, tables);
      tables[tableName] = columns.map(c => ({ name: c.column, type: c.type }));
    }
    query = query.substring(lastIndex);
    processed = processed.substring(lastIndex);
  }
  const [start, end] = /^\s*select\s(distinct\s)?(?<select>.+?)\sfrom\s.+$/mdi
    .exec(processed)
    .indices
    .groups
    .select;
  const select = query.substring(start, end);
  const selectColumns = getSelectColumns(select, tables);
  const fromTables = [];
  const fromPattern = /\sfrom\s+(?<from>(.|\s)+?)((\swhere\s)|(\sgroup\s)|(\swindow\s)|(\sorder\s)|(\slimit\s)|(\s*$))/mid;
  const { processedQuery, tempTables } = getTempTables(query, fromPattern, tables);
  tables = { ...tables, ...tempTables };
  const blanked = blank(processedQuery);
  const [fromStart, fromEnd] = fromPattern.exec(blanked).indices.groups.from;
  const fromClause = processedQuery.substring(fromStart, fromEnd);
  const from = fromClause
    .replaceAll(/(\snatural\s)|(\sfull\s)|(\sinner\s)|(\scross\s)|(\souter\s)/gm, ' ')
    .replaceAll(',', 'join')
    .replaceAll(/\son\s.+?(\s((left\s)|(right\s))?join\s)/gm, '$1')
    .replaceAll(/\son\s+[^\s]+\s=\s+[^\s]+/gm, ' ')
    .split(/((?:(?:left\s)|(?:right\s))?join)\s/gm)
    .map(s => s.trim());
  const matches = fromClause
    .replaceAll(/(\snatural\s)|(\sfull\s)|(\sinner\s)|(\scross\s)|(\souter\s)/gm, ' ')
    .matchAll(/(?<! left) join .+ on (.+) = (.+)($|( join )|( left join ))/gmi);
  const joinColumns = Array
    .from(matches)
    .flatMap(m => [m[1], m[2]])
    .map(c => {
      const parts = c.split('.');
      if (parts.length === 1) {
        return {
          columnName: parts[0]
        }
      }
      return {
        tableAlias: parts[0],
        columnName: parts[1]
      }
    });
  const whereColumns = getWhereColumns(query);
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
    if (column.column) {
      results.push(column.column);
      continue;
    }
    let type = null;
    let tableName;
    let primaryKey;
    let foreign;
    let notNull = false;
    let isOptional = false;
    if (column.functionName) {
      if (notNullFunctions.has(column.functionName)) {
        notNull = true;
      }
    }
    if (column.type) {
      if ((column.functionName === 'min' || column.functionName === 'max') && column.columnName) {
        const fromTable = fromTables.find(t => t.tableAlias === column.tableAlias);
        tableName = fromTable.tableName;
        const tableColumn = tables[fromTable.tableName].find(c => c.name === column.columnName);
        notNull = tableColumn.notNull;
        if (tableColumn.type === 'date') {
          type = 'date';
        }
        else if (tableColumn.type === 'boolean') {
          type = 'boolean';
        }
        else if (tableColumn.type === 'text') {
          type = 'text';
        }
        else {
          type = column.type;
        }
      }
      else {
        type = column.type;
      }
    }
    else if (column.columnName) {
      const fromTable = fromTables.find(t => t.tableAlias === column.tableAlias);
      tableName = fromTable.tableName;
      const tableAlias = column.tableAlias;
      if (column.columnName === '*') {
        for (const column of tables[fromTable.tableName]) {
          let type = column.type;
          const joinColumn = joinColumns.find(c => c.tableAlias === tableAlias && c.columnName === column.name);
          const whereColumn = whereColumns.find(c => c.tableAlias === tableAlias && c.columnName === column.name);
          const notNull = column.notNull === true || column.primaryKey || joinColumn || whereColumn;
          results.push({
            column: column.name,
            type,
            originalName: column.name,
            tableName,
            primaryKey: column.primaryKey,
            foreign: column.foreign,
            notNull,
            isOptional: fromTable.isOptional
          });
        }
        continue;
      }
      else {
        const tableColumn = tables[fromTable.tableName].find(c => c.name === column.columnName);
        const joinColumn = joinColumns.find(c => c.tableAlias === column.tableAlias && c.columnName === column.columnName);
        const whereColumn = whereColumns.find(c => c.tableAlias === column.tableAlias && c.columnName === column.columnName);
        primaryKey = tableColumn.primaryKey;
        foreign = tableColumn.foreign;
        type = tableColumn.type;
        notNull = tableColumn.notNull === true || tableColumn.primaryKey || joinColumn || whereColumn;
        isOptional = fromTable.isOptional;
      }
    }
    results.push({
      name: column.columnAlias || column.columnName,
      type,
      originalName: column.columnName,
      tableName,
      primaryKey,
      foreign,
      notNull,
      isOptional,
      rename: column.rename
    });
  }
  return results;
}

export {
  parseQuery,
  getQueryType
}
