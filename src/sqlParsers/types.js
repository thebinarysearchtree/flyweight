import { readFile, writeFile, readdir } from 'fs/promises';
import pluralize from 'pluralize';
import { join } from 'path';
import { parseQuery } from './queries.js';
import { convertPrefixes, renameColumns, toArrayName, sliceProps } from '../map.js';
import { makeOptions } from '../proxy.js';
import { blank } from './utils.js';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const definitions = await readFile(new URL('../../interfaces.d.ts', import.meta.url), 'utf8');

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

const hasNull = (tsType) => {
  return tsType
    .split('|')
    .map(t => t.trim())
    .some(t => t === 'null');
}

const removeOptional = (tsType) => tsType.replace(/ \| optional$/, '');
const removeNull = (tsType) => tsType.replace(/ \| null($| )/, '');

const convertOptional = (tsType) => {
  if (hasNull(tsType)) {
    return removeOptional(tsType);
  }
  return tsType.replace(/ \| optional$/, ' | null');
}

const getTsType = (column, customTypes) => {
  if (column.types) {
    const types = [];
    for (const item of column.types) {
      types.push(toTsType(item, customTypes));
    }
    let split = types.join(' | ').split(' | ');
    const optional = split.find(s => s === 'optional');
    if (optional) {
      split = split.filter(s => s !== 'optional');
    }
    const unique = new Set(split);
    let joined = Array.from(unique.values()).join(' | ');
    if (optional) {
      joined += ' | optional';
    }
    return joined;
  }
  return toTsType(column, customTypes);
}

const toTsType = (column, customTypes) => {
  const { type, functionName, notNull, isOptional, structuredType } = column;
  if (structuredType) {
    if (functionName === 'json_group_array') {
      const structured = structuredType;
      if (typeof structured.type !== 'string') {
        const types = [];
        for (const [key, value] of Object.entries(structured.type)) {
          types.push(`${key}: ${removeNull(getTsType(value, customTypes))}`);
        }
        return `Array<{ ${types.join(', ')} }>`;
      }
      if (structured.type !== 'json') {
        let tsType;
        if (typeMap[structured.type]) {
          tsType = typeMap[structured.type];
        }
        else {
          tsType = customTypes[structured.type].tsType;
        }
        return `Array<${tsType}>`;
      }
    }
    else if (functionName === 'json_object') {
      const structured = structuredType.type;
      const types = [];
      for (const [key, value] of Object.entries(structured)) {
        types.push(`${key}: ${getTsType(value, customTypes)}`);
      }
      return `{ ${types.join(', ')} }`;
    }
    else if (functionName === 'json_array') {
      const types = [];
      for (const type of structuredType) {
        types.push(getTsType(type, customTypes));
      }
      return `[${types.join(', ')}]`
    }
  }
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
  if (!notNull && !hasNull(tsType) && tsType !== 'any') {
    tsType += ' | null';
  }
  if (isOptional) {
    tsType += ' | optional';
  }
  return tsType;
}

const parseParams = (sql) => {
  const processed = blank(sql, { stringsOnly: true });
  const matches = processed.matchAll(/(\s|,)\$(?<param>[a-z0-9_]+)(\s|,|$)/gmi);
  const params = {};
  for (const match of matches) {
    params[match.groups.param] = true;
  }
  return Object.keys(params);
}

const getQueries = async (db, sqlDir, tableName) => {
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
    let columns;
    try {
      columns = parseQuery(sql, db.tables);
    }
    catch {
      throw Error(`Error trying to parse ${queryPath}.`);
    }
    const params = parseParams(sql);
    if (columns.length === 0) {
      parsedQueries.push({
        queryName,
        params
      });
      continue;
    }
    if (columns.length === 1) {
      const tsType = getTsType(columns[0], db.customTypes);
      parsedQueries.push({
        queryName,
        interfaceName: convertOptional(tsType),
        params
      });
      continue;
    }
    const interfaceName = capitalize(tableName) + capitalize(queryName);
    let interfaceString = `export interface ${interfaceName} {\n`;
    const sample = {};
    for (const column of columns) {
      const tsType = getTsType(column, db.customTypes);
      sample[column.name] = tsType;
    }
    const options = makeOptions(columns, db);
    const adjusted = convertPrefixes(sample, options.prefixes);
    const makeProperties = (sample, indent) => {
      sample = renameColumns(sample, options.columns, options.prefixes);
      let interfaceString = '';
      for (const [key, type] of Object.entries(sample)) {
        if (typeof type === 'string') {
          interfaceString += `${indent}${key}: ${convertOptional(type)};\n`;
        }
        else {
          const types = [];
          const foreignKeyName = Object.keys(type)[0];
          const foreignKeyType = type[foreignKeyName];
          const optional = hasNull(foreignKeyType);
          for (const [k, t] of Object.entries(type)) {
            let type;
            if (k === foreignKeyName && optional) {
              type = t.split(' | ').filter(t => t !== 'null').join(' | ');
            }
            else {
              type = t;
            }
            types.push(`${k}: ${removeOptional(type)}`);
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
      interfaceString,
      params
    });
  }
  const multipleInterfaceName = capitalize(tableName) + 'Queries';
  const singularInterfaceName = capitalize(pluralize.singular(tableName)) + 'Queries';
  let multipleInterfaceString = `export interface ${multipleInterfaceName} {\n`;
  let singularInterfaceString = `export interface ${singularInterfaceName} {\n`;
  for (const query of parsedQueries) {
    const {
      queryName,
      interfaceName,
      params
    } = query;
    const multipleReturnType = interfaceName ? `Promise<Array<${interfaceName}>>` : 'Promise<void>';
    const singularReturnType = interfaceName ? `Promise<${interfaceName} | undefined>` : 'Promise<void>';
    let paramInterface = '';
    if (params.length > 0) {
      paramInterface += 'params: { ';
      for (const param of params) {
        paramInterface += `${param}: any; `;
      }
      paramInterface += '}';
    }
    multipleInterfaceString += `  ${queryName}(${paramInterface}): ${multipleReturnType};\n`;
    singularInterfaceString += `  ${queryName}(${paramInterface}): ${singularReturnType};\n`;
  }
  multipleInterfaceString += `}\n`;
  singularInterfaceString += `}\n`;
  const queryInterfaces = parsedQueries
    .filter(q => q.interfaceString !== undefined)
    .map(q => q.interfaceString);
  return {
    multipleInterfaceName,
    singularInterfaceName,
    multipleInterfaceString,
    singularInterfaceString,
    queryInterfaces
  }
}

const createTypes = async (options) => {
  const {
    db,
    sqlDir,
    destinationPath
  } = options;
  const tables = Object.entries(db.tables).map(([key, value]) => ({ name: key, columns: value }));
  let types = '';
  if (/\.d\.ts/.test(destinationPath)) {
    types += `import Database from 'flyweightjs';\n\n`;
  }
  types += definitions;
  types += '\n\n';
  const returnTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const interfaceName = capitalize(singular);
    const multipleTableName = table.name;
    const singularTableName = singular;
    let multipleReturnType;
    let singularReturnType;
    const primaryKey = table.columns.find(c => c.primaryKey !== undefined);
    let tsType;
    if (primaryKey) {
      tsType = toTsType({
        type: primaryKey.type,
        notNull: true
      }, db.customTypes);
    }
    else {
      tsType = 'undefined';
    }
    if (db.viewSet.has(table.name)) {
      multipleReturnType = `  ${multipleTableName}: Pick<MultipleQueries<${interfaceName}, Insert${interfaceName}, Where${interfaceName}>, "get">`;
      singularReturnType = `  ${singularTableName}: Pick<SingularQueries<${interfaceName}, Insert${interfaceName}, Where${interfaceName}, ${tsType}>, "get">`;
    }
    else {
      multipleReturnType = `  ${multipleTableName}: MultipleQueries<${interfaceName}, Insert${interfaceName}, Where${interfaceName}>`;
      singularReturnType = `  ${singularTableName}: SingularQueries<${interfaceName}, Insert${interfaceName}, Where${interfaceName}, ${tsType}>`;
    }
    let queries;
    if (sqlDir) {
      queries = await getQueries(db, sqlDir, table.name);
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
        notNull: notNull || primaryKey
      }, db.customTypes);
      let property = `  ${name}`;
      property += ': ';
      property += tsType;
      property += ';\n';
      types += property;
    }
    types += '}\n\n';
    types += `export interface Insert${interfaceName} {\n`;
    for (const column of table.columns) {
      const { name, type, primaryKey, notNull, hasDefault } = column;
      const tsType = toTsType({
        type,
        notNull: true
      }, db.customTypes);
      let property = `  ${name}`;
      if (primaryKey || !notNull || hasDefault) {
        property += '?: ';
      }
      else {
        property += ': ';
      }
      property += tsType;
      property += ';\n';
      types += property;
    }
    types += '}\n\n';
    types += `export interface Where${interfaceName} {\n`;
    for (const column of table.columns) {
      const { name, type, primaryKey, notNull } = column;
      const tsType = toTsType({
        type,
        notNull: true
      }, db.customTypes);
      const customType = db.customTypes[type];
      const dbType = customType ? customType.dbType : type;
      let property = `  ${name}`;
      property += '?: ';
      property += tsType;
      property += ` | Array<${tsType}>`;
      if (dbType === 'text') {
        property += ' | RegExp';
      }
      if (!primaryKey && !notNull) {
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
      types += queries.multipleInterfaceString;
      types += '\n';
      types += queries.singularInterfaceString;
      types += '\n';
    }
  }
  const interfaceName = options.interfaceName || 'TypedDb';
  types += `export interface ${interfaceName} {\n`;
  types += '  [key: string]: any,\n';
  for (const returnType of returnTypes) {
    types += returnType + ',\n';
  }
  types += '  begin(): Promise<void>,\n';
  types += '  commit(): Promise<void>,\n';
  types += '  rollback(): Promise<void>';
  types += '\n}\n\n';
  if (/\.d\.ts/.test(destinationPath)) {
    types += `declare const database: Database;\n`;
    types += `declare const db: ${interfaceName};\n`;
    types += 'export function getTables(): Promise<string>;\n';
    types += 'export function createMigration(name: string): Promise<void>;\n';
    types += 'export function runMigration(name: string): Promise<void>;\n\n';
    types += 'export {\n  database,\n  db,\n  getTables,\n  createMigration,\n  runMigration\n}\n';
  }
  await writeFile(destinationPath, types, 'utf8');
}

export {
  createTypes
}
