import { toSql, columnToSql, indexToSql, toHash } from './tables.js'

const recreate = (table, current) => {
  const temp = `temp_${table.name}`;
  let sql = toSql({ ...table, name: temp, indexes: [] });
  const shared = current
    .columns
    .filter(c => table.columns.map(c => c.name).includes(c.name))
    .map(c => c.name)
    .join(', ');
  sql += '\n';
  sql += `insert into ${temp} (${shared}) select ${shared} from ${table.name};\n`;
  sql += `drop table ${table.name};\n`;
  sql += `alter table ${temp} rename to ${table.name};\n`;
  for (const index of table.indexes) {
    sql += indexToSql(index);
  }
  sql += 'pragma foreign_key_check;\n';
  return sql;
}

const diff = (existing, updated) => {
  const migrations = '';
  const newTables = updated.filter(u => !existing.map(e => e.name).includes(u.name));
  for (const table of newTables) {
    migrations += toSql(table);
  }
  const removedTables = existing.filter(e => !updated.map(u => u.name).includes(e.name));
  for (const table of removedTables) {
    migrations += `drop table ${table.name};\n`;
  }
  for (const table of updated) {
    const current = existing.find(t => t.name === table.name);
    if (!current) {
      continue;
    }
    const removeChecks = current
      .checks
      .filter(c => !table.checks.includes(c))
      .length > 0;
    const removePrimary = current
      .primaryKeys
      .filter(k => !table.primaryKeys.includes(k))
      .length > 0;
    const removeForeign = current
      .foreignKeys
      .map(k => Object.values(k).join(''))
      .filter(k => !table.foreignKeys.map(f => Object.values(f).join(''))
      .includes(k))
      .length > 0;
    if (removeChecks || removePrimary || removeForeign) {
      migrations += recreate(table, current);
      continue;
    }
    const addColumns = table
      .columns
      .filter(u => !current.columns.map(c => c.name).includes(u.name));
    for (const column of addColumns) {
      const clause = columnToSql(column);
      const sql = `alter table ${table.name} add column ${clause};\n`;
      migrations += sql;
    }
    const existingHashes = current.indexes.map(index => toHash(index));
    const updatedHashes = table.indexes.map(index => toHash(index));
    const removeIndexes = existingHashes.filter(h => !updatedHashes.includes(h));
    for (const index of removeIndexes) {
      migrations += `drop index ${index};\n`;
    }
    const removeColumns = current
      .columns
      .filter(c => !table.columns.map(c => c.name).includes(c.name));
    for (const column of removeColumns) {
      migrations += `alter table ${table.name} drop column ${column.name};\n`;
    }
  }
  return migrations;
}

export default diff;
