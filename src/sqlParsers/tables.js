const parseTables = (sql) => {
  const tables = [];

  const matches = sql.matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+);/gmi);

  for (const match of matches) {
    const table = {
      name: match.groups.tableName,
      columns: []
    };
    const columns = match.groups.columns
      .replaceAll(/\([^)]+\)/gm, '')
      .split(',');
    for (let column of columns) {
      column = column.replace(/^\s+/, '');
      const words = column.split(/\s+/);
      if (/^unique\(/.test(words[0])) {
        continue;
      }
      const name = words[0];
      const type = words[1];
      const primaryKey = words[2] === 'primary' && words[3] === 'key';
      const notNull = primaryKey || (words[2] === 'not' && words[3] === 'null');
      table.columns.push({
        name,
        type,
        primaryKey,
        notNull
      });
    }
    tables.push(table);
  }
  return tables;
}

const getTables = async (database) => {
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
      type: r.type.toLowerCase(),
      primaryKey: Boolean(r.pk),
      notNull: Boolean(r.notnull)
    }));
    tables.push(table);
  }
  return tables;
}

export {
  parseTables,
  getTables
}
