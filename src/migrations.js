import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { blank } from './parsers/utils.js';
import { readSql } from './utils.js';

const getIndexes = (statements, blanked) => {
  const pattern = /^create\s+(unique\s+)?index\s+(if\s+not\s+exists\s+)?(?<indexName>[a-z0-9_]+)\s+on\s+(?<tableName>[a-z0-9_]+)\([^;]+;/gmid;
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

const getTriggers = (statements, blanked) => {
  const split = blanked.split(/((?:^|\s)create\s)/i);
  const items = [];
  let last;
  let start = 0;
  for (const blanked of split) {
    if (/((?:^|\s)create\s)/i.test(blanked)) {
      last = blanked;
    }
    else {
      const item = last + statements.substring(start, start + blanked.length);
      items.push(item);
    }
    start += blanked.length;
  }
  const triggers = [];
  for (const item of items) {
    const match = /^\s*create\s+trigger\s+(?<triggerName>[a-z0-9_]+)\s/gmi.exec(item);
    if (match) {
      triggers.push({
        name: match.groups.triggerName,
        sql: item.trim()
      });
    }
  }
  return triggers;
}

const getTriggerMigrations = (currentTriggers, lastTriggers) => {
  const migrations = [];
  const actionedLastTriggers = [];
  for (const trigger of currentTriggers) {
    const lastTrigger = lastTriggers.find(t => t.name === trigger.name);
    if (lastTrigger) {
      actionedLastTriggers.push(lastTrigger.name);
      if (lastTrigger.sql === trigger.sql) {
        continue;
      }
      else {
        migrations.push(`drop trigger ${trigger.name};`);
        migrations.push(trigger.sql);
      }
    }
    else {
      migrations.push(trigger.sql);
    }
  }
  for (const trigger of lastTriggers) {
    if (!actionedLastTriggers.includes(trigger.name)) {
      migrations.push(`drop trigger ${trigger.name};`);
    }
  }
  return migrations;
}

const getVirtualTables = (statements, blanked) => {
  const pattern = /^\s*create\s+virtual\s+table\s+(?<tableName>[a-z0-9_]+)\s+using\s+(?<tableContents>[^;]+);/gmid;
  const matches = blanked.matchAll(pattern);
  const tables = [];
  for (const match of matches) {
    const [start, end] = match.indices[0];
    const sql = statements.substring(start, end);
    const [restStart, restEnd] = match.indices.groups.tableContents;
    const rest = sql.substring(restStart, restEnd);
    tables.push({
      name: match.groups.tableName,
      sql,
      rest
    });
  }
  return tables;
}

const getVirtualMigrations = (currentTables, lastTables) => {
  const migrations = [];
  const currentNames = currentTables.map(t => t.name);
  const actionedLastTables = [];
  for (const table of currentTables) {
    const lastTable = lastTables.find(t => t.name === table.name);
    if (lastTable && lastTable.sql === table.sql) {
      actionedLastTables.push(lastTable.name);
      continue;
    }
    if (lastTable && lastTable.sql !== table.sql) {
      migrations.push(`drop table ${table.name};`);
      migrations.push(table.sql);
    }
    if (!lastTable) {
      const sameSql = lastTables.filter(t => t.rest === table.rest && !currentNames.includes(t.name) && !actionedLastTables.includes(t.name));
      if (sameSql.length > 0) {
        const tableName = sameSql[0].name;
        migrations.push(`alter table ${tableName} rename to ${table.name};`);
        actionedLastTables.push(tableName);
        continue;
      }
      else {
        migrations.push(table.sql);
      }
    }
  }
  for (const table of lastTables) {
    if (!actionedLastTables.includes(table.name)) {
      migrations.push(`drop table ${table.name};`);
    }
  }
  return migrations;
}

const getTables = (sql) => {
  const tables = [];
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+)\)(?<without>\s+without rowid,)?\s+strict;/gmid);
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
    if (tableMatch.groups.without) {
      constraints.push('without rowid');
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
  let currentViewsText = '';
  const viewMigrations = [];
  if (viewsPath) {
    currentViewsText = await readSql(viewsPath);
    let lastViewsText;
    try {
      lastViewsText = await readSql(lastViewsPath);
      const currentViews = getViews(currentViewsText);
      const lastViews = getViews(lastViewsText);
      const currentViewNames = new Set(currentViews.map(v => v.name));
      for (const view of currentViews) {
        const lastView = lastViews.find(v => v.name === view.name);
        if (!lastView) {
          viewMigrations.push(view.sql);
        }
        if (lastView && lastView.sql !== view.sql) {
          viewMigrations.push(`drop view ${view.name};`);
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
      await writeFile(lastViewsPath, currentViewsText, 'utf8');
    }
  }
  try {
    const lastSql = await readSql(lastTablesPath);
    last = db.convertTables(lastSql);
    blankedLast = blank(last);
  }
  catch {
    let sql = current;
    if (viewMigrations.length > 0) {
      sql += '\n';
      sql += viewMigrations.join('\n');
      sql += '\n';
    }
    await writeFile(outputPath, sql, 'utf8');
    await writeFile(lastTablesPath, currentSql, 'utf8');
    console.log('Migration created.');
    process.exit();
  }
  const currentTriggers = getTriggers(current, blankedCurrent);
  const lastTriggers = getTriggers(last, blankedLast);
  const triggerMigrations = getTriggerMigrations(currentTriggers, lastTriggers);
  const currentVirtualTables = getVirtualTables(current, blankedCurrent);
  const lastVirtualTables = getVirtualTables(last, blankedLast);
  const virtualMigrations = getVirtualMigrations(currentVirtualTables, lastVirtualTables);
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
    const tableConstraints = table.constraints.sort((a, b) => a.localeCompare(b)).join(', ');
    const sameNameConstraints = sameName.constraints.sort((a, b) => a.localeCompare(b)).join(', ');
    if (tableConstraints !== sameNameConstraints) {
      recreate = true;
    }
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
  const migrations = [...tableMigrations, ...columnMigrations, ...indexMigrations, ...viewMigrations, ...virtualMigrations, ...triggerMigrations];
  if (migrations.length === 0) {
    console.log('No changes were detected.');
    process.exit();
  }
  const sql = migrations.join('\n');
  try {
    await readFile(outputPath, 'utf8');
    console.log(`${outputPath} already exists.`);
  }
  catch {
    await writeFile(outputPath, sql, 'utf8');
    await writeFile(lastTablesPath, currentSql, 'utf8');
    await writeFile(lastViewsPath, currentViewsText, 'utf8');
    console.log('Migration created.');
  }
}

export {
  migrate
}
