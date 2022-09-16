import { blank } from './utils.js';

const typeMap = {
  integer: 'number',
  int: 'number',
  text: 'string',
  blob: 'Buffer',
  any: 'number | string | Buffer'
};

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
      columns: []
    };
    const columns = blank(match.groups.columns)
      .replaceAll(/\s+/gm, ' ')
      .split(',')
      .map(s => s.trim());
    for (let column of columns) {
      const match = /^(?<name>[a-z0-9_]+)\s(?<type>[a-z0-9_]+)((?<primaryKey> primary key)|(?<notNull> not null))?(\sreferences\s+(?<foreign>[a-z0-9_]+)\s)?/mi.exec(column);
      if (!match) {
        continue;
      }
      const { name, type, primaryKey, notNull, foreign } = match.groups;
      if (['unique', 'check', 'primary', 'foreign'].includes(name)) {
        continue;
      }
      table.columns.push({
        name,
        type,
        primaryKey: primaryKey !== undefined,
        notNull: notNull !== undefined,
        foreign
      });
    }
    tables.push(table);
  }
  return tables;
}

export {
  getTables,
  getFragments
}
