import { getTables } from './tables.js';
import { readFile, writeFile, readdir } from 'fs/promises';
import pluralize from 'pluralize';
import { join } from 'path';
import { parseQuery } from './queries.js';
import { convertPrefixes, renameColumns, toArrayName, sliceProps } from '../map.js';
import { makeOptions } from '../proxy.js';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const file = await readFile(new URL('../../index.d.ts', import.meta.url), 'utf8');
const definitions = /(?<definitions>export interface Keywords<T>(.|\s)+?export interface MultipleQueries<T>[^}]+})/.exec(file).groups.definitions;

const getTablesFrom = async (createTablePath) => {
  const sql = await readFile(createTablePath, 'utf8');
  const tables = getTables(sql);
  return tables;
}

const typeMap = {
  integer: 'number',
  real: 'number',
  text: 'string',
  blob: 'Buffer',
  any: 'number | string | Buffer'
}

const functionTypes = {
  instr: 'number | null',
  sign: 'number | null',
  json_array: 'Array<any>',
  json_array_length: 'number',
  json_object: '{ [key: string]: any }',
  json_type: 'string | null',
  json_valid: 'number',
  json_group_array: 'Array<any>',
  json_group_object: '{ [key: string]: any }'
}

const toTsType = (column, customTypes) => {
  const { type, functionName, canBeNull } = column;
  let tsType;
  if (typeMap[type]) {
    tsType = typeMap[type];
  }
  else {
    tsType = customTypes[type].tsType;
  }
  if (functionName) {
    const functionType = functionTypes[functionName];
    if (functionType) {
      tsType = functionType;
    }
    if (functionName === 'min' || functionName === 'max') {
      tsType += ' | null';
    }
  }
  const hasNull = tsType
    .split('|')
    .map(t => t.trim())
    .some(t => t === 'null');
  if (canBeNull && !hasNull && tsType !== 'any') {
    tsType += ' | null';
  }
  return tsType;
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
    const queryPath = join(path, fileName);
    const sql = await readFile(queryPath, 'utf8');
    const columns = parseQuery(sql, tablesMap);
    if (columns.length === 0) {
      parsedQueries.push({
        queryName,
        singular: 'Promise<void>',
        multiple: 'Promise<void>'
      });
      continue;
    }
    if (columns.length === 1) {
      const tsType = toTsType(columns[0], db.customTypes);
      parsedQueries.push({
        queryName,
        singular: `Promise<${tsType}>`,
        multiple: `Promise<Array<${tsType}>>`
      });
      continue;
    }
    const interfaceName = capitalize(tableName) + capitalize(queryName);
    let interfaceString = `export interface ${interfaceName} {\n`;
    const sample = {};
    for (const column of columns) {
      const tsType = toTsType(column, db.customTypes);
      sample[column.name] = tsType;
    }
    const options = makeOptions(columns, db);
    const adjusted = convertPrefixes(sample, options.prefixes);
    const makeProperties = (sample, indent) => {
      sample = renameColumns(sample, options.columns, options.prefixes);
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
      const nextKey = primaryKeys[1];
      const sliced = sliceProps(sample, currentKey ? currentKey.index : 0, nextKey ? nextKey.index : undefined);
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
    interfaceString += getMappedTypes(adjusted, options.primaryKeys, 0);
    interfaceString += `}\n`;
    parsedQueries.push({
      queryName,
      interfaceName,
      interfaceString
    });
  }
  const multipleInterfaceName = capitalize(tableName) + 'Queries';
  const singularInterfaceName = capitalize(pluralize.singular(tableName)) + 'Queries';
  let multipleInterfaceString = `export interface ${multipleInterfaceName} {\n`;
  let singularInterfaceString = `export interface ${singularInterfaceName} {\n`;
  for (const query of parsedQueries) {
    const {
      queryName,
      interfaceName
    } = query;
    const multipleReturnType = `Promise<Array<${interfaceName}>>`;
    const singularReturnType = `Promise<${interfaceName}>`;
    multipleInterfaceString += `  ${queryName}(params: any): ${multipleReturnType};\n`;
    singularInterfaceString += `  ${queryName}(params: any): ${singularReturnType};\n`;
  }
  multipleInterfaceString += `}\n`;
  singularInterfaceString += `}\n`;
  return {
    multipleInterfaceName,
    singularInterfaceName,
    multipleInterfaceString,
    singularInterfaceString,
    queryInterfaces: parsedQueries.map(q => q.interfaceString)
  }
}

const createTypes = async (options) => {
  const {
    db,
    sqlDir,
    createTablePath,
    destinationPath 
  } = options;
  const tables = await getTablesFrom(createTablePath);
  let types = '';
  const returnTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const interfaceName = capitalize(singular);
    const multipleTableName = table.name;
    const singularTableName = singular;
    let multipleReturnType = `  ${multipleTableName}: MultipleQueries<${interfaceName}>`;
    let singularReturnType = `  ${singularTableName}: SingularQueries<${interfaceName}>`;
    let queries;
    if (sqlDir) {
      queries = await getQueries(db, sqlDir, table.name, tables);
      if (queries) {
        multipleReturnType += ` & ${queries.multipleInterfaceName}`;
        singularReturnType += ` & ${queries.singularInterfaceName}`;
      }
    }
    returnTypes.push(multipleReturnType, singularReturnType);
    types += `export interface ${interfaceName} {\n`;
    for (const column of table.columns) {
      const { name, type, primaryKey, notNull } = column;
      const tsType = toTsType({
        type,
        canBeNull: !notNull && !primaryKey
      }, db.customTypes);
      let property = `  ${name}`;
      property += ': ';
      property += tsType;
      property += ';\n';
      types += property;
    }
    types += '}\n\n';
    if (queries) {
      for (const queryInterface of queries.queryInterfaces) {
        types += queryInterface;
        types += '\n';
      }
      types += queries.multipleInterfaceString;
      types += '\n';
      types += queries.singularInterfaceString;
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
