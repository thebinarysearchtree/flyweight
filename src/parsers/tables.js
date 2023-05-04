import { blank } from './utils.js';
import { parseQuery } from './queries.js';

const getVirtual = (sql) => {
  const pattern = /^\s*create virtual table\s+(?<tableName>[a-z0-9_]+)\s+using\s+fts5\s*\((?<columns>[^;]+)\)\s*;/gmid;
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(pattern);
  const tables = [];
  for (const tableMatch of tableMatches) {
    const tableName = tableMatch.groups.tableName;
    const [start, end] = tableMatch.indices.groups.columns;
    const columnsText = sql.substring(start, end);
    const columnMatches = blank(columnsText, { stringsOnly: true }).matchAll(/(?<column>[^,]+)(,|$)/gmid);
    const columnNames = [];
    for (const columnMatch of columnMatches) {
      const [start, end] = columnMatch.indices.groups.column;
      const column = columnsText.substring(start, end);
      const match = /^[^\s]+/gm.exec(column.trim());
      if (!column.includes('=') && match) {
        columnNames.push(match[0]);
      }
    }
    const columns = [];
    columns.push({
      name: 'rowid',
      type: 'integer',
      primaryKey: true,
      notNull: false,
      hasDefault: false
    });
    const mapped = columnNames.map(name => {
      return {
        name,
        type: 'text',
        primaryKey: false,
        notNull: true,
        hasDefault: false
      }
    });
    for (const column of mapped) {
      columns.push(column);
    }
    tables.push({
      name: tableName,
      columns,
      columnSet: new Set(columns.map(c => c.name))
    });
  }
  return tables;
}

const getViews = (sql, db) => {
  const pattern = /^\s*create\s+view\s+(?<viewName>[a-z0-9_]+)\s+(\([^)]+\)\s+)?as\s+(?<select>[^;]+);/gmid;
  const matches = blank(sql, { stringsOnly: true }).matchAll(pattern);
  const views = [];
  for (const match of matches) {
    const name = match.groups.viewName;
    const [start, end] = match.indices.groups.select;
    const selectSql = sql.substring(start, end);
    const parsed = parseQuery(selectSql, db.tables);
    if (!parsed) {
      continue;
    }
    const columns = parsed.map(column => {
      const { name, type, primaryKey, foreign, notNull, isOptional } = column;
      return {
        name,
        type,
        primaryKey,
        notNull: notNull && !isOptional,
        hasDefault: false,
        foreign
      }
    });
    views.push({
      name,
      columns,
      columnSet: new Set(columns.map(c => c.name))
    });
  }
  return views;
}

const getColumn = (sql) => {
  const split = sql.split(/\s+/);
  const isColumn = split.length > 0 && !['unique', 'check', 'primary', 'foreign'].includes(split[0].toLowerCase());
  if (!isColumn) {
    return;
  }
  let type;
  if (split.length === 1 || ['not', 'primary', 'foreign', 'check'].includes(split[1].toLowerCase())) {
    type = split[0].toLowerCase();
  }
  else {
    type = split[1];
  }
  return {
    name: split[0],
    type
  }
}

const getFragments = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)\)(\s+without\s+rowid\s*)?\s*;/gmid);
  for (const tableMatch of tableMatches) {
    const [tableStart] = tableMatch.indices.groups.columns;
    const columnMatches = blank(tableMatch.groups.columns).matchAll(/(?<column>[^,]+)(,|$)/gmd);
    for (const columnMatch of columnMatches) {
      const [columnStart, columnEnd] = columnMatch.indices.groups.column;
      const result = getColumn(columnMatch.groups.column.trim());
      const start = tableStart + columnStart;
      const end = start + (columnEnd - columnStart);
      if (lastEnd !== start) {
        fragments.push({
          isColumn: false,
          sql: sql.substring(lastEnd, start)
        });
      }
      lastEnd = end;
      const fragment = sql.substring(start, end).replace(/\n$/, '');
      fragments.push({
        columnName: result ? result.name : null,
        type: result ? result.type : null,
        isColumn: result !== undefined,
        start,
        end,
        sql: fragment,
        blanked: columnMatch.groups.column
      });
    }
  }
  fragments.push({
    isColumn: false,
    sql: sql.substring(lastEnd)
  });
  return fragments;
}

const getTables = (sql) => {
  const tables = [];

  const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)\)(\s+without\s+rowid\s*)?\s*;/gmi);

  for (const match of matches) {
    const table = {
      name: match.groups.tableName,
      columns: [],
      columnSet: null
    };
    const columns = blank(match.groups.columns)
      .replaceAll(/\s+/gm, ' ')
      .split(',')
      .map(s => s.trim());
    let primaryKeys;
    for (let column of columns) {
      const result = getColumn(column);
      if (!result) {
        continue;
      }
      const primaryKey = / primary key/mi.test(column);
      const notNull = / not null/mi.test(column);
      const hasDefault = / default /mi.test(column);
      const foreignMatch = / references (?<foreign>[a-z0-9_]+)(\s|$)/mi.exec(column);
      const foreign = foreignMatch ? foreignMatch.groups.foreign : undefined;
      if (/^(unique|check|primary|foreign)/mi.test(column)) {
        const match = /^primary key\((?<keys>[^)]+)\)/mi.exec(column);
        if (match) {
          primaryKeys = match.groups.keys.split(',').map(k => k.trim());
        }
        continue;
      }
      table.columns.push({
        name: result.name,
        type: result.type,
        primaryKey,
        notNull,
        hasDefault,
        foreign
      });
    }
    if (primaryKeys) {
      for (const column of table.columns) {
        if (primaryKeys.includes(column.name)) {
          column.primaryKey = true;
        }
      }
    }
    if (!table.columns.some(c => c.primaryKey)) {
      table.columns.push({
        name: 'rowid',
        type: 'integer',
        primaryKey: true,
        notNull: false,
        hasDefault: false
      });
    }
    table.columnSet = new Set(table.columns.map(c => c.name));
    tables.push(table);
  }
  return tables;
}

export {
  getTables,
  getFragments,
  getViews,
  getVirtual
}
