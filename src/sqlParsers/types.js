import { getTables } from './tables.js';
import { readFile, writeFile, readdir } from 'fs/promises';
import pluralize from 'pluralize';
import { join } from 'path';
import { parse } from './queries.js';
import { getPrimaryKeys, convertPrefixes, toArrayName, sliceProps } from '../map.js';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const file = await readFile(new URL('../../index.d.ts', import.meta.url), 'utf8');
const definitions = /(?<definitions>export interface Keywords<T>(.|\s)+?export interface BasicQueries<T>[^}]+})/.exec(file).groups.definitions;

const getTablesFrom = async (options) => {
  const { createTablePath, db } = options;
  let tables;
  if (createTablePath) {
    const sql = await readFile(createTablePath, 'utf8');
    tables = getTables(sql);
  }
  else {
    if (db.tables.length > 0) {
      tables = db.tables;
    }
    else {
      await db.setTables();
      tables = db.tables;
    }
    tables = Object.entries(tables).map(([key, value]) => ({ name: key, columns: value }));
  }
  return tables;
}

const getQueries = async (db, sqlDir, tableName, tables) => {
  let tablesMap = {};
  for (const table of tables) {
    tablesMap[table.name] = table.columns;
  }
  const path = join(sqlDir, tableName);
  let fileNames;
  try {
    fileNames = await readdir(path);
  }
  catch {
    return null;
  }
  const parsedQueries = [];
  for (const fileName of fileNames) {
    if (!fileName.endsWith('.sql')) {
      continue;
    }
    const queryName = fileName.substring(0, fileName.length - 4);
    const mapper = db.getMapper(tableName, queryName);
    if (mapper.result === 'none') {
      parsedQueries.push({
        queryName,
        tsType: 'Promise<void>'
      });
      continue;
    }
    if (mapper.result.startsWith('value')) {
      const { name, type } = parse(sql, tablesMap)[0];
      let returnType;
      if (mapper.parse) {
        const parsed = db.parseKey(name);
        if (parsed) {
          returnType = parsed.type;
        }
      }
      else {
        returnType = type;
      }
      const tsType = mapper.result === 'value' ? `Promise<${returnType}>` : `Promise<Array<${returnType}>>`;
      parsedQueries.push({
        queryName,
        tsType
      });
      continue;
    }
    const queryPath = join(path, fileName);
    const sql = await readFile(queryPath, 'utf8');
    const columns = parse(sql, tablesMap);
    const interfaceName = capitalize(tableName) + capitalize(queryName);
    let interfaceString = `interface ${interfaceName} {\n`;
    if (!mapper.map) {
      for (const column of columns) {
        const { name, type } = column;
        const parsedKey = db.parseKey(name);
        if (parsedKey && mapper.parse) {
          const { key, type } = parsedKey;
          interfaceString += `  ${key}: ${type};\n`;
        }
        else {
          interfaceString += `  ${name}: ${type};\n`;
        }
      }
    }
    else {
      const sample = {};
      for (const column of columns) {
        const { name, type } = column;
        const parsedKey = db.parseKey(name);
        if (parsedKey && mapper.parse) {
          const { key, type } = parsedKey;
          sample[key] = type;
        }
        else {
          sample[name] = type;
        }
      }
      let { skip, prefixes } = mapper;
      if (prefixes && Array.isArray(prefixes)) {
        const result = {};
        for (const prefix of prefixes) {
          result[prefix] = prefix;
        }
        prefixes = result;
      }
      const primaryKeys = getPrimaryKeys(sample, skip, prefixes);
      const adjusted = convertPrefixes(sample, prefixes);
      const makeProperties = (sample, indent) => {
        let interfaceString = '';
        for (const [key, type] of Object.entries(sample)) {
          if (typeof type === 'string') {
            interfaceString += `${indent}${key}: ${type};\n`;
          }
          else {
            const types = [];
            let optional = true;
            for (const [k, t] of Object.entries(type)) {
              types.push(`${k}: ${t}`);
              if (!t.split('|').map(type => type.trim()).includes('null')) {
                optional = false;
              }
            }
            const colon = optional ? '?:' : ':';
            const properties = types.join('; ');
            interfaceString += `${indent}${key}${colon} { ${properties} };\n`;
          }
        }
        return interfaceString;
      }
      const makeSpaces = (levels) => {
        const spaces = 2 * (levels + 1);
        let result = '';
        for (let i = 0; i < spaces; i++) {
          result += ' ';
        }
        return result;
      }
      const getMappedTypes = (sample, primaryKeys, levels) => {
        const spaces = makeSpaces(levels);
        levels++;
        let interfaceString = '';
        const currentKey = primaryKeys[0];
        if (!currentKey) {
          return interfaceString;
        }
        const nextKey = primaryKeys[1];
        const sliced = sliceProps(sample, currentKey.index, nextKey ? nextKey.index : undefined);
        if (!nextKey) {
          interfaceString += makeProperties(sliced, spaces);
          return interfaceString;
        }
        const arrayName = toArrayName(nextKey.name);
        interfaceString += makeProperties(sliced, spaces);
        const result = getMappedTypes(sample, primaryKeys.slice(1), levels);
        interfaceString += `${spaces}${arrayName}: Array<{\n${result}${spaces}}>;\n`;
        return interfaceString;
      }
      interfaceString += getMappedTypes(adjusted, primaryKeys, 0);
    }
    interfaceString += `}\n`;
    let returnType;
    if (mapper.result === 'array') {
      returnType = `Promise<Array<${interfaceName}>>`;
    }
    else {
      returnType = `Promise<${interfaceName} | null>`;
    }
    parsedQueries.push({
      queryName,
      returnType,
      interfaceString
    });
  }
  const interfaceName = capitalize(pluralize.singular(tableName)) + 'Queries';
  let interfaceString = `interface ${interfaceName} {\n`;
  for (const query of parsedQueries) {
    const { queryName, returnType } = query;
    interfaceString += `  ${queryName}: ${returnType};\n`;
  }
  interfaceString += `}\n`;
  return {
    interfaceName,
    interfaceString,
    queryInterfaces: parsedQueries.map(q => q.interfaceString)
  }
}

const createTypes = async (options) => {
  const {
    db,
    sqlDir, 
    destinationPath 
  } = options;
  const tables = await getTablesFrom(options);
  let types = '';
  const returnTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const interfaceName = capitalize(singular);
    let returnType = `  ${table.name}: BasicQueries<${interfaceName}>`;
    let queries;
    if (sqlDir) {
      queries = await getQueries(db, sqlDir, table.name, tables);
      if (queries) {
        returnType += ` & ${queries.interfaceName}`;
      }
    }
    returnTypes.push(returnType);
    types += `export interface ${interfaceName} {\n`;
    for (const column of table.columns) {
      const { name, type, primaryKey, notNull } = column;
      const parsedKey = db.parseKey(name);
      const tsType = parsedKey ? parsedKey.type : type;
      let property = `  ${name}`;
      property += ': ';
      property += tsType;
      if (!notNull && !primaryKey) {
        property += ' | null';
      }
      property += ';\n';
      types += property;
    }
    types += '}\n\n';
    if (queries) {
      for (const queryInterface of queries.queryInterfaces) {
        types += queryInterface;
        types += '\n';
      }
      types += queries.interfaceString;
      types += '\n';
    }
  }
  types += definitions;
  types += '\n\n';
  types += 'export interface TypedDb {\n';
  types += returnTypes.join(',\n');
  types += '\n}\n\n';
  types += 'declare const db: TypedDb;\n\n';
  types += 'export default db;\n';
  await writeFile(destinationPath, types, 'utf8');
}

export {
  createTypes
}
