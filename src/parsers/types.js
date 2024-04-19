import { readFile, writeFile, readdir } from 'fs/promises';
import pluralize from 'pluralize';
import { join } from 'path';
import { parseQuery } from './queries.js';
import { renameColumns } from '../map.js';
import { makeOptions } from '../proxy.js';
import { blank } from './utils.js';
import { preprocess } from './preprocessor.js';
import files from './files.js';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

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

const getOptional = (structuredType, optional) => {
  if (typeof structuredType.type === 'string') {
    optional.push(structuredType.isOptional);
    return;
  }
  else {
    for (const value of Object.values(structuredType.type)) {
      getOptional(value, optional);
    }
  }
}

const toTsType = (column, customTypes) => {
  let tsType;
  const { type, functionName, notNull, isOptional, structuredType } = column;
  if (structuredType) {
    if (functionName === 'json_group_array') {
      const structured = structuredType;
      if (typeof structured.type !== 'string') {
        if (Array.isArray(structured.type)) {
          const optional = [];
          getOptional(structured, optional);
          const isOptional = !optional.some(o => o === false);
          const types = [];
          for (const value of structured.type) {
            let type = getTsType(value, customTypes);
            if (isOptional) {
              type = removeOptional(type);
            }
            else {
              type = convertOptional(type);
            }
            types.push(type);
          }
          return `Array<[${types.join(', ')}]>`;
        }
        const optional = [];
        getOptional(structured, optional);
        const isOptional = !optional.some(o => o === false);
        const types = [];
        for (const [key, value] of Object.entries(structured.type)) {
          let type = getTsType(value, customTypes);
          if (isOptional) {
            type = removeOptional(type);
          }
          else {
            type = convertOptional(type);
          }
          types.push(`${key}: ${type}`);
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
        return `Array<${removeNull(convertOptional(tsType))}>`;
      }
    }
    else if (functionName === 'json_object') {
      const structured = structuredType.type;
      const types = [];
      const optional = [];
      getOptional(structuredType, optional);
      const isOptional = !optional.some(o => o === false);
      for (const [key, value] of Object.entries(structured)) {
        let type = getTsType(value, customTypes);
        if (isOptional) {
          type = removeOptional(type);
        }
        else {
          type = convertOptional(type);
        }
        types.push(`${key}: ${type}`);
      }
      let type = `{ ${types.join(', ')} }`;
      if (isOptional) {
        type += ' | null';
      }
      return type;
    }
    else if (functionName === 'json_array') {
      const types = [];
      for (const type of structuredType) {
        types.push(convertOptional(getTsType(type, customTypes)));
      }
      return `[${types.join(', ')}]`;
    }
  }
  if (!tsType) {
    if (typeMap[type]) {
      tsType = typeMap[type];
    }
    else {
      const customType = customTypes[type];
      if (!customType) {
        throw Error(`The type "${type}" has not been registered.`);
      }
      tsType = customTypes[type].tsType;
    }
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

const parsePattern = (sql, pattern) => {
  const processed = blank(sql, { stringsOnly: true });
  const matches = processed.matchAll(pattern);
  const params = {};
  for (const match of matches) {
    params[match.groups.param] = true;
  }
  return Object.keys(params);
}

const parseParams = (sql) => {
  return parsePattern(sql, /(\s|,|\()\$(?<param>[a-z0-9_]+)(\s|,|\)|$)/gmi);
}

const parseUnsafe = (sql) => {
  return parsePattern(sql, /(\s|,|\()\$\{(?<param>[a-z0-9_]+)\}(\s|,|\)|$)/gmi);
}

const makeUnique = (name, typeSet, i) => {
  if (typeSet.has(name)) {
    name = `${name}${i}`;
    i++;
  }
  else {
    typeSet.add(name);
  }
  return name;
}

const getQueries = async (db, sqlDir, tableName, typeSet, i) => {
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
    let sql = await readFile(queryPath, 'utf8');
    try {
      sql = preprocess(sql, db.tables);
      const params = parseParams(sql);
      const unsafe = parseUnsafe(sql);
      const columns = parseQuery(sql, db.tables);
      if (columns.length === 0) {
        parsedQueries.push({
          queryName,
          params,
          unsafe
        });
        continue;
      }
      if (columns.length === 1) {
        const tsType = getTsType(columns[0], db.customTypes);
        parsedQueries.push({
          queryName,
          interfaceName: convertOptional(tsType),
          params,
          unsafe
        });
        continue;
      }
      const interfaceName = makeUnique(capitalize(tableName) + capitalize(queryName), typeSet, i);
      let interfaceString = `export interface ${interfaceName} {\n`;
      const sample = {};
      for (const column of columns) {
        const tsType = getTsType(column, db.customTypes);
        sample[column.name] = tsType;
      }
      const options = makeOptions(columns, db);
      const makeProperties = (sample) => {
        sample = renameColumns(sample, options.columns);
        let interfaceString = '';
        for (const [key, type] of Object.entries(sample)) {
          if (typeof type === 'string') {
            interfaceString += `  ${key}: ${convertOptional(type)};\n`;
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
            interfaceString += `  ${key}${colon} { ${properties} };\n`;
          }
        }
        return interfaceString;
      }
      interfaceString += makeProperties(sample);
      interfaceString += `}\n`;
      parsedQueries.push({
        queryName,
        interfaceName,
        interfaceString,
        params,
        unsafe
      });
    }
    catch (e) {
      if (e.debug) {
        throw e;
      }
      let message = `Could not parse ${fileName} in "${tableName}" folder.`;
      message += `\n${sql}\n`;
      try {
        const statement = await db.prepare(sql, db.read);
        await db.finalize(statement);
      }
      catch (e) {
        message += e.message;
      }
      throw Error(message);
    }
  }
  const multipleInterfaceName = makeUnique(capitalize(tableName) + 'Queries', typeSet, i);
  const singularInterfaceName = makeUnique(capitalize(pluralize.singular(tableName)) + 'Queries', typeSet, i);
  let multipleInterfaceString = `export interface ${multipleInterfaceName} {\n`;
  let singularInterfaceString = `export interface ${singularInterfaceName} {\n`;
  for (const query of parsedQueries) {
    const {
      queryName,
      interfaceName,
      params,
      unsafe
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
    if (unsafe.length > 0) {
      paramInterface += ', options?: { unsafe?: { ';
      for (const param of unsafe) {
        paramInterface += `${param}?: any; `;
      }
      paramInterface += '}}';
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
  let index = files.index;
  index = index.replace('export default class Database', 'export class Database');
  index = index.replace(/export \{[^\}]+\}/, '');
  const definitions = files.interfaces;
  
  const typeSet = new Set();
  let i = 1;
  const matches = (index + '\n' + definitions).matchAll(/^(export )?(default )?(interface|class) (?<name>[a-z0-9_]+)/gmi);
  for (const match of matches) {
    typeSet.add(match.groups.name.toLowerCase());
  }
  const tables = Object.entries(db.tables).map(([key, value]) => ({ name: key, columns: value }));
  let types = '';
  if (/\.d\.ts/.test(destinationPath)) {
    types += index;
    types += '\n';
    types = types.replace(/^export class Database {/gm, 'declare class Database {');
  }
  types += definitions;
  types += '\n\n';
  const returnTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const capitalized = capitalize(singular);
    const interfaceName = makeUnique(capitalized, typeSet, i);
    const insertInterfaceName = makeUnique(`Insert${interfaceName}`, typeSet, i);
    const whereInterfaceName = makeUnique(`Where${interfaceName}`, typeSet, i);
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
      multipleReturnType = `  ${multipleTableName}: Pick<MultipleQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}>, "get">`;
      singularReturnType = `  ${singularTableName}: Pick<SingularQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}, ${tsType}>, "get">`;
    }
    else if (db.virtualSet.has(table.name)) {
      multipleReturnType = `  ${multipleTableName}: MultipleVirtualQueries<${interfaceName}, ${whereInterfaceName}>`;
      singularReturnType = `  ${singularTableName}: SingularVirtualQueries<${interfaceName}, ${whereInterfaceName}>`;
    }
    else {
      multipleReturnType = `  ${multipleTableName}: MultipleQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}>`;
      singularReturnType = `  ${singularTableName}: SingularQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}, ${tsType}>`;
    }
    let queries;
    if (sqlDir) {
      queries = await getQueries(db, sqlDir, table.name, typeSet, i);
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
    types += `export interface ${insertInterfaceName} {\n`;
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
    types += `export interface ${whereInterfaceName} {\n`;
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
    if (db.virtualSet.has(table.name)) {
      types += `  ${table.name}?: string;\n`;
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
  types += `export interface TypedDb {\n`;
  types += '  [key: string]: any,\n';
  for (const returnType of returnTypes) {
    types += returnType + ',\n';
  }
  types += '  begin(): Promise<void>,\n';
  types += '  commit(): Promise<void>,\n';
  types += '  rollback(): Promise<void>,\n';
  types += `  getTransaction(): Promise<TypedDb>,\n`;
  types += `  release(transaction: TypedDb): void`;
  types += '\n}\n\n';
  if (/\.d\.ts/.test(destinationPath)) {
    types = types.replaceAll(/^export /gm, '');
    types += `declare const database: Database;\n`;
    types += `declare const db: TypedDb;\n`;
    types += 'declare function makeTypes(): Promise<void>;\n';
    types += 'declare function getTables(): Promise<string>;\n';
    types += 'declare function createMigration(name: string): Promise<{ sql: string, undo: () => Promise<void>}>;\n';
    types += 'declare function runMigration(name: string): Promise<void>;\n';
    types += 'declare const sqlPath: string;\n\n';
    types += 'export {\n  database,\n  db,\n  makeTypes,\n  getTables,\n  createMigration,\n  runMigration,\n  sqlPath\n}\n';
  }
  await writeFile(destinationPath, types, 'utf8');
}

export {
  createTypes
}
