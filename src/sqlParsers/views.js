import { blank } from './utils.js';
import { parseQuery } from './queries.js';

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

export {
  getViews
}
