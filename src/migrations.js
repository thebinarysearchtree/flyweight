import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { blank } from './sqlParsers/utils.js';

const getIndexes = (statements, blanked) => {
  const pattern = /^create (unique )?index (if not exists )?(?<indexName>[a-z0-9_]+) on [^;]+;/gmid;
  const indexes = [];
  for (const match of blanked.matchAll(pattern)) {
    const [start, end] = match.indices[0];
    const sql = statements.substring(start, end);
    const name = match.groups.indexName;
    indexes.push({ name, sql });
  }
  return indexes;
}

const getIndexMigrations = (currentIndexes, lastIndexes) => {
  const currentSql = currentIndexes.map(i => i.sql);
  const lastSql = lastIndexes.map(i => i.sql);
  const migrations = [];
  const drop = lastIndexes
    .filter(i => !currentSql.includes(i.sql))
    .map(i => `drop index ${i.name};`);
  migrations.push(...drop);
  const add = currentIndexes
    .filter(i => !lastSql.includes(i.sql))
    .map(i => i.sql);
  migrations.push(...add);
  return migrations;
}

const getTables = (sql) => {
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+)\);/gmid);
  for (const tableMatch of tableMatches) {
    const tableName = tableMatch.groups.tableName;
    const [tableStart, tableEnd] = tableMatch.indices[0];
    const tableText = sql.substring(tableStart, tableEnd);
    const blanked = blank(tableMatch.groups.columns);
    const [columnStart, columnEnd] = tableMatch.indices.groups.columns;
    const columnText = sql.substring(columnStart, columnEnd);
    const columnMatches = blanked.matchAll(/(^|,)(?<column>.+)(,|$)/gmid);
    const columns = [];
    const constraints = [];
    for (const columnMatch of columnMatches) {
      const [start, end] = columnMatch.indices.groups.column;
      const text = columnText.substring(start, end);
      const adjusted = text.replaceAll(/\s+/, ' ').trim();
      const columnName = adjusted.split(' ')[0];
      const rest = adjusted.replace(columnName, '').trim();
      if (['unique', 'check', 'primary', 'foreign'].includes(columnName)) {
        constraints.push(adjusted);
      }
      else {
        columns.push({
          name: columnName,
          sql: adjusted,
          rest
        });
      }
    }
    tables.push({
      name: tableName,
      sql: tableText,
      columnText,
      columns,
      constraints
    });
  }
}

const migrate = async (db, tablesPath, migrationPath, migrationName) => {
  const outputPath = join(migrationPath, `${new Date().getTime()}_${migrationName}.sql`);
  const currentSql = await readFile(tablesPath, 'utf8');
  const current = db.convertTables(currentSql);
  const blankedCurrent = blank(current);
  let last;
  let blankedLast;
  try {
    const path = join(migrationPath, 'lastTables.sql');
    const lastSql = await readFile(path, 'utf8');
    last = db.convertTables(lastSql);
    blankedLast = blank(last);
  }
  catch {
    await writeFile(outputPath, current, 'utf8');
    return 'Migration succeeded';
  }
  const currentIndexes = getIndexes(current, blankedCurrent);
  const lastIndexes = getIndexes(last, blankedLast);
  const indexMigrations = getIndexMigrations(currentIndexes, lastIndexes);
  const currentTables = getTables(current);
  const currentNames = currentTables.map(t => t.name);
  const lastTables = getTables(last);
  const lastNames = lastTables.map(l => l.name);
  const tableMigrations = [];
  const columnMigrations = [];
  const actionedCurrentTables = [];
  const actionedLastTables = [];
  for (const table of currentTables) {
    const migrations = [];
    const sameSql = lastTables.find(t => t.sql === table.sql);
    if (sameSql) {
      actionedCurrentTables.push(sameSql.name);
      actionedLastTables.push(sameSql.name);
      continue;
    }
    const sameName = lastTables.find(t => t.name === table.name);
    const sameColumns = lastTables.filter(t => t.columnText === table.columnText);
    if (!sameName && sameColumns.length > 0) {
      const notCurrent = sameColumns.filter(t => !currentNames.includes(t.name));
      if (notCurrent.length === 1) {
        const oldName = notCurrent[0].name;
        const newName = table.name;
        actionedCurrentTables.push(newName);
        actionedLastTables.push(oldName);
        migrations.push(`alter table ${oldName} rename to ${newName};`);
        continue;
      }
      else {
        actionedCurrentTables.push(table.name);
        migrations.push(table.sql);
        continue;
      }
    }
    if (!sameName) {
      actionedCurrentTables.push(table.name);
      migrations.push(table.sql);
      continue;
    }
    const currentColumns = table.columns.map(c => c.name);
    const lastColumns = sameName.columns.map(c => c.name);
    const actionedCurrentColumns = [];
    const actionedLastColumns = [];
    let recreate = false;
    for (const column of sameName.columns) {
      const sameSql = table.columns.find(c => c.sql === column.sql);
      if (sameSql) {
        actionedCurrentColumns.push(sameSql.name);
        actionedLastColumns.push(sameSql.name);
        continue;
      }
      const sameName = table.columns.find(c => c.name === column.name);
      const sameRest = table.columns.filter(c => c.rest === column.rest);
      if (!sameName && sameRest.length > 0) {
        const notCurrent = sameRest.filter(c => !currentColumns.includes(c.name));
        if (notCurrent.length === 1) {
          const oldName = column.name;
          const newName = notCurrent[0].name;
          actionedCurrentColumns.push(newName);
          actionedLastColumns.push(oldName);
          migrations.push(`alter table ${table.name} rename column ${oldName} to ${newName};`);
          continue;
        }
        else {
          actionedLastColumns.push(column.name);
          migrations.push(`alter table ${table.name} drop column ${column.name};`);
          continue;
        }
      }
      if (!sameName) {
        actionedLastColumns.push(column.name);
        migrations.push(`alter table ${table.name} drop column ${column.name};`);
        continue;
      }
      recreate = true;
      break;
    }
    if (actionedCurrentColumns.length !== currentColumns.length) {
      const columns = currentColumns
        .map((c, i) => ({ 
          index: i, 
          column: c, 
          actioned: actionedCurrentColumns.includes(c.name) 
        }))
        .filter(c => !c.actioned);
      const index = columns[0].index;
      if (index !== currentColumns.length - (currentColumns.length - actionedCurrentColumns.length)) {
        recreate = true;
      }
      else {
        for (const column of columns.map(c => c.column)) {
          migrations.push(`alter table ${table.name} add column ${column.sql}`);
        }
      }
    }
    if (!recreate) {
      columnMigrations.push(...migrations);
    }
    else {
      let migration = '';
      migration += 'pragma foreign_keys = off;\n';
      migration += 'begin;\n';
    }
  }
}