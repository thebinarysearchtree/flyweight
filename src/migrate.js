import { toSql, columnToSql } from './tables.js'

const diff = (existing, updated) => {
  const migrations = [];
  const newTables = updated.filter(u => !existing.map(e => e.name).includes(u.name));
  for (const table of newTables) {
    migrations.push(toSql(table));
  }
  const removedTables = existing.filter(e => !updated.map(u => u.name).includes(e.name));
  for (const table of removedTables) {
    migrations.push(`drop table ${table.name};`);
  }
  for (const table of updated) {
    const current = existing.find(t => t.name === table.name);
    if (!current) {
      continue;
    }
    const addColumns = table
      .columns
      .filter(u => !current.columns.map(c => c.name).includes(u.name));
    for (const column of addColumns) {
      const clause = columnToSql(column);
      const sql = `alter table ${table.name} add column ${clause};`;
      migrations.push(sql);
    }
  }
}