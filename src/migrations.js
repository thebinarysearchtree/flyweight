import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { blank } from './sqlParsers/utils.js';
import { readSql } from './utils.js';

const getIndexes = (statements, blanked) => {
  const pattern = /^create (unique )?index (if not exists )?(?<indexName>[a-z0-9_]+) on (?<tableName>[a-z0-9_]+)\([^;]+;/gmid;
  const indexes = [];
  for (const match of blanked.matchAll(pattern)) {
    const [start, end] = match.indices[0];
    const sql = statements.substring(start, end);
    const name = match.groups.indexName;
    const table = match.groups.tableName;
    indexes.push({ name, table, sql });
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
  const tables = [];
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+)\)\s+strict;/gmid);
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
      let adjusted = text.replaceAll(/\s+/gm, ' ').replace(/,$/, '').trim();
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
  return tables;
}

const getViews = (sql) => {
  const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create\s+view\s+(?<viewName>[a-z0-9_]+)\s+([^;]+);/gmi);
  return Array.from(matches).map(m => {
    return {
      name: m.groups.viewName,
      sql: m[0]
    }
  });
}

const migrate = async (db, tablesPath, viewsPath, migrationPath, migrationName) => {
  const outputPath = join(migrationPath, `${migrationName}.sql`);
  const lastTablesPath = join(migrationPath, 'lastTables.sql');
  const lastViewsPath = join(migrationPath, 'lastViews.sql');
  const currentSql = await readSql(tablesPath);
  const current = db.convertTables(currentSql);
  const blankedCurrent = blank(current);
  let last;
  let blankedLast;
  const viewMigrations = [];
  if (viewsPath) {
    const currentViewsText = await readSql(viewsPath);
    let lastViewsText;
    try {
      lastViewsText = await readSql(lastViewsPath);
      const currentViews = getViews(currentViewsText);
      const lastViews = getViews(lastViewsText);
      const currentViewNames = new Set(currentViews.map(v => v.name));
      const lastViewNames = new Set(lastViews.map(v => v.name));
      for (const view of currentViews) {
        if (!lastViewNames.has(view.name)) {
          viewMigrations.push(view.sql);
        }
      }
      for (const view of lastViews) {
        if (!currentViewNames.has(view.name)) {
          viewMigrations.push(`drop view ${view.name};`);
        }
      }
    }
    catch {
      viewMigrations.push(currentViewsText);
    }
  }
  try {
    const lastSql = await readSql(lastTablesPath);
    last = db.convertTables(lastSql);
    blankedLast = blank(last);
  }
  catch {
    if (migrationName) {
      await writeFile(outputPath, current, 'utf8');
      await writeFile(lastTablesPath, currentSql, 'utf8');
      console.log('Migration created.');
      process.exit();
    }
    else {
      console.log(current);
    }
  }
  const currentIndexes = getIndexes(current, blankedCurrent);
  const lastIndexes = getIndexes(last, blankedLast);
  const indexMigrations = getIndexMigrations(currentIndexes, lastIndexes);
  const currentTables = getTables(current);
  const currentNames = currentTables.map(t => t.name);
  const lastTables = getTables(last);
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
      const notCurrent = sameColumns.filter(t => !actionedCurrentTables.includes(t.name) && !currentNames.includes(t.name));
      if (notCurrent.length > 0) {
        const oldName = notCurrent[0].name;
        const newName = table.name;
        actionedCurrentTables.push(newName);
        actionedLastTables.push(oldName);
        tableMigrations.push(`alter table ${oldName} rename to ${newName};`);
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
      tableMigrations.push(table.sql);
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
        const notCurrent = sameRest.filter(c => !actionedCurrentColumns.includes(c.name) && !lastColumns.includes(c.name));
        if (notCurrent.length > 0) {
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
      const columns = table.columns
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
          migrations.push(`alter table ${table.name} add column ${column.sql};`);
        }
      }
    }
    actionedLastTables.push(table.name);
    if (!recreate) {
      columnMigrations.push(...migrations);
    }
    else {
      const indexes = currentIndexes.filter(i => i.table === table.name);
      let migration = '';
      const tempName = table.name + '_new';
      migration += table.sql.replace(/(^\s*create\s+table\s+)([a-zA-Z0-9_]+)(\s*\()/gmi, '$1$2_new$3');
      migration += '\n\n';
      const columns = sameName.columns.filter(c => currentColumns.includes(c.name)).map(c => `    ${c.name}`);
      migration += `insert into ${tempName} select\n${columns.join(',\n')}\nfrom ${table.name};\n\n`;
      migration += `drop table ${table.name};\n`;
      migration += `alter table ${tempName} rename to ${table.name};\n`;
      for (const index of indexes) {
        migration += index.sql;
        migration += '\n';
      }
      migration += `pragma foreign_key_check;\n`;
      tableMigrations.push(migration);
    }
  }
  for (const table of lastTables) {
    if (!actionedLastTables.includes(table.name)) {
      tableMigrations.push(`drop table ${table.name};`);
    }
  }
  let migrations = '';
  migrations += tableMigrations.join('\n');
  migrations += columnMigrations.join('\n');
  migrations += indexMigrations.join('\n');
  migrations += viewMigrations.join('\n');
  if (migrations === '') {
    console.log('No changes were detected.');
    process.exit();
  }
  if (migrationName) {
    try {
      await readFile(outputPath, 'utf8');
      console.log(`${outputPath} already exists.`);
    }
    catch {
      await writeFile(outputPath, migrations, 'utf8');
      await writeFile(lastTablesPath, currentSql, 'utf8');
      console.log('Migration created.');
    }
  }
  else {
    console.log(migrations);
  }
}

export {
  migrate
}
