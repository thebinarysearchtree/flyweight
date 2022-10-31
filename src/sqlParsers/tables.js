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
    const columnMatches = blank(columnsText, { stringsOnly: true }).matchAll(/(^|,)(?<column>.+?)(,|$)/gmid);
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
    const columns = parseQuery(selectSql, db.tables).map(column => {
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

const getFragments = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)\)(\s+without\s+rowid\s*)?\s*;/gmid);
  for (const tableMatch of tableMatches) {
    const [tableStart] = tableMatch.indices.groups.columns;
    const columnMatches = blank(tableMatch.groups.columns).matchAll(/(?<column>[^,]+)(,|(\s*\)\s*$))/gmd);
    for (const columnMatch of columnMatches) {
      const [columnStart, columnEnd] = columnMatch.indices.groups.column;
      const match = /^\s+(?<name>[a-z0-9_]+)(\s+(?<type>[a-z0-9_]+))?((?<primaryKey>\s+primary key)|(?<notNull>\s+not null)|(\s+foreign\s+)|(\s+check(\s+|\()))?/mi.exec(columnMatch.groups.column);
      const isColumn = match && !['unique', 'check', 'primary', 'foreign'].includes(match.groups.name);
      let type;
      if (isColumn) {
        if (match.groups.type === undefined) {
          type = match.groups.name.toLowerCase();
        }
        else {
          type = match.groups.type;
        }
      }
      else {
        type = null;
      }
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
        columnName: isColumn ? match.groups.name : null,
        type,
        isColumn,
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
      const match = /^(?<name>[a-z0-9_]+)(\s(?<type>[a-z0-9_]+))?((?<primaryKey> primary key)|(?<notNull> not null))?(\sreferences\s+(?<foreign>[a-z0-9_]+)\s)?(\scheck(\s|\())?/mi.exec(column);
      if (!match) {
        continue;
      }
      const name = match.groups.name;
      let type = match.groups.type;
      if (type === undefined) {
        type = name.toLowerCase();
      }
      const primaryKey = / primary key/mi.test(column);
      const notNull = / not null/mi.test(column);
      const hasDefault = / default /mi.test(column);
      const foreignMatch = / references (?<foreign>[a-z0-9_]+)(\s|$)/mi.exec(column);
      const foreign = foreignMatch ? foreignMatch.groups.foreign : undefined;
      if (/(unique)|(check)|(primary)|(foreign)/mi.test(name)) {
        const match = /^primary key\((?<keys>[^)]+)\)/mi.exec(column);
        if (match) {
          primaryKeys = match.groups.keys.split(',').map(k => k.trim());
        }
        continue;
      }
      table.columns.push({
        name,
        type,
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
