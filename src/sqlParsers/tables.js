import { blank } from './utils.js';

const typeMap = {
  integer: 'number',
  int: 'number',
  text: 'string',
  blob: 'Buffer',
  any: 'number | string | Buffer'
};

const fromSql = (sql) => {
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
      const match = /^(?<name>[a-z0-9_]+)\s(?<type>[a-z0-9_]+)((?<primaryKey> primary key)|(?<notNull> not null))?/mi.exec(column);
      if (!match) {
        continue;
      }
      const { name, type, primaryKey, notNull } = match.groups;
      if (['unique', 'check', 'primary', 'foreign'].includes(name)) {
        continue;
      }
      table.columns.push({
        name,
        type: typeMap[type],
        primaryKey: primaryKey !== undefined,
        notNull: notNull !== undefined || primaryKey !== undefined
      });
    }
    tables.push(table);
  }
  return tables;
}

const fromDb = async (database) => {
  const result = await database.all(`select name from sqlite_master where type='table'`);
  const tableNames = result.map(r => r.name);
  const tables = [];
  for (const name of tableNames) {
    const table = {
      name,
      columns: []
    };
    const result = await database.all(`pragma table_info(${name})`);
    table.columns = result.map(r => ({
      name: r.name,
      type: typeMap[r.type.toLowerCase()],
      primaryKey: Boolean(r.pk),
      notNull: Boolean(r.notnull)
    }));
    tables.push(table);
  }
  return tables;
}

const getTables = (source) => {
  if (typeof source === 'string') {
    return fromSql(source);
  }
  return fromDb(source);
}

export {
  getTables
}
