import { blank } from './utils.js';

const getFragments = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+);/gmid);
  for (const tableMatch of tableMatches) {
    const [tableStart] = tableMatch.indices.groups.columns;
    const columnMatches = blank(tableMatch.groups.columns).matchAll(/(?<column>[^,]+)(,|(\s*\)\s*$))/gmd);
    for (const columnMatch of columnMatches) {
      const [columnStart, columnEnd] = columnMatch.indices.groups.column;
      const match = /^\s+(?<name>[a-z0-9_]+)\s+(?<type>[a-z0-9_]+)((?<primaryKey>\s+primary key)|(?<notNull>\s+not null))?/mi.exec(columnMatch.groups.column);
      const isColumn = match && !['unique', 'check', 'primary', 'foreign'].includes(match.groups.name);
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
        type: isColumn ? match.groups.type : null,
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

  const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+);/gmi);

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
      const match = /^(?<name>[a-z0-9_]+)\s(?<type>[a-z0-9_]+)((?<primaryKey> primary key)|(?<notNull> not null))?(\sreferences\s+(?<foreign>[a-z0-9_]+)\s)?/mi.exec(column);
      if (!match) {
        continue;
      }
      const { name, type } = match.groups;
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
    table.columnSet = new Set(table.columns.map(c => c.name));
    tables.push(table);
  }
  return tables;
}

export {
  getTables,
  getFragments
}
