import { readFile, writeFile, readdir } from 'fs/promises';
import pluralize from 'pluralize';
import { join } from 'path';
import { parseQuery } from './queries.js';
import { renameColumns, toArrayName, sliceProps } from '../map.js';
import { makeOptions } from '../proxy.js';
import { blank } from './utils.js';
import { preprocess } from './preprocessor.js';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const definitions = await readFile(new URL('../../interfaces.d.ts', import.meta.url), 'utf8');

let i = 1;

const typeSet = new Set();
typeSet.add('database');
typeSet.add('typeddb');

const matches = definitions.matchAll(/^export interface (?<name>[a-z0-9_]+)/gmi);
for (const match of matches) {
  typeSet.add(match.groups.name.toLowerCase());
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

const getTsType = (column, customTypes, parsedInterfaces) => {
  if (column.types) {
    const types = [];
    for (const item of column.types) {
      types.push(toTsType(item, customTypes, parsedInterfaces));
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
  return toTsType(column, customTypes, parsedInterfaces);
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

const parseExtractor = (column, parsedInterfaces) => {
  const extractor = column.jsonExtractor.extractor;
  const tsType = column.jsonExtractor.type;
  const definedType = parsedInterfaces[tsType];
  if (!definedType) {
    return;
  }
  if (/^\d+$/.test(extractor)) {
    if (definedType.arrayType) {
      return definedType.arrayType;
    }
    if (definedType.tupleTypes) {
      return definedType.tupleTypes[Number(extractor)];
    }
  }
  if (/^[a-z0-9_]+$/i.test(extractor)) {
    return definedType.objectProperties[extractor];
  }
  if (/\$(\.[a-z0-9_]+(\[-?\d+\])?)+/gmi.test(extractor)) {
    const properties = extractor.substring(2).split('.');
    let type = definedType;
    for (const property of properties) {
      const match = /^(?<name>[a-z0-9_]+)(\[(?<index>-?\d+)\])?$/mi.exec(property);
      const { name, index } = match.groups;
      type = type.objectProperties[name];
      if (index) {
        if (type.arrayType) {
          type = type.arrayType;
        }
        else {
          type = type.tupleTypes.at(Number(index));
        }
      }
    }
    return type;
  }
}

const toTsType = (column, customTypes, parsedInterfaces) => {
  let tsType;
  if (column.jsonExtractor && parsedInterfaces) {
    const extracted = parseExtractor(column, parsedInterfaces);
    if (extracted) {
      tsType = extracted.tsType.replace(/ undefined$/, ' null');
    }
  }
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
            let type = getTsType(value, customTypes, parsedInterfaces);
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
          let type = getTsType(value, customTypes, parsedInterfaces);
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
        let type = getTsType(value, customTypes, parsedInterfaces);
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
        types.push(convertOptional(getTsType(type, customTypes, parsedInterfaces)));
      }
      return `[${types.join(', ')}]`;
    }
  }
  if (!tsType) {
    if (typeMap[type]) {
      tsType = typeMap[type];
    }
    else {
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

const parseParams = (sql) => {
  const processed = blank(sql, { stringsOnly: true });
  const matches = processed.matchAll(/(\s|,|\()\$(?<param>[a-z0-9_]+)(\s|,|\)|$)/gmi);
  const params = {};
  for (const match of matches) {
    params[match.groups.param] = true;
  }
  return Object.keys(params);
}

const makeUnique = (name) => {
  if (typeSet.has(name)) {
    name = `${name}${i}`;
    i++;
  }
  typeSet.add(name);
  return name;
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
    let sql = await readFile(queryPath, 'utf8');
    sql = preprocess(sql, db.tables);
    const params = parseParams(sql);
    let columns;
    try {
      columns = parseQuery(sql, db.tables);
    }
    catch {
      parsedQueries.push({
        queryName,
        interfaceName: 'any',
        params
      });
      continue;
    }
    if (columns.length === 0) {
      parsedQueries.push({
        queryName,
        params
      });
      continue;
    }
    if (columns.length === 1) {
      const tsType = getTsType(columns[0], db.customTypes, db.interfaces);
      parsedQueries.push({
        queryName,
        interfaceName: convertOptional(tsType),
        params
      });
      continue;
    }
    const interfaceName = makeUnique(capitalize(tableName) + capitalize(queryName));
    let interfaceString = `export interface ${interfaceName} {\n`;
    const sample = {};
    for (const column of columns) {
      const tsType = getTsType(column, db.customTypes, db.interfaces);
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
    const getMappedTypes = (sample, primaryKeys, subInterfaces, keys = []) => {
      let interfaceString = '';
      const currentKey = primaryKeys[0];
      const nextKey = primaryKeys[1];
      const sliced = sliceProps(sample, currentKey ? currentKey.index : 0, nextKey ? nextKey.index : undefined);
      if (!nextKey) {
        interfaceString += makeProperties(sliced);
        return interfaceString;
      }
      const arrayName = toArrayName(nextKey);
      keys.push(arrayName);
      interfaceString += makeProperties(sliced);
      const result = getMappedTypes(sample, primaryKeys.slice(1), subInterfaces, [...keys]);
      const subInterfaceName = interfaceName + keys.map(k => capitalize(k)).join('');
      const subInterface = `export interface ${subInterfaceName} {\n${result}};`;
      subInterfaces.push(subInterface);
      interfaceString += `  ${arrayName}: Array<${subInterfaceName}>;\n`;
      return interfaceString;
    }
    const subInterfaces = [];
    interfaceString += getMappedTypes(sample, options.primaryKeys, subInterfaces);
    interfaceString += `}\n`;
    if (subInterfaces.length > 0) {
      const temp = interfaceString;
      interfaceString = subInterfaces.join('\n\n');
      interfaceString += '\n\n';
      interfaceString += temp;
    }
    parsedQueries.push({
      queryName,
      interfaceName,
      interfaceString,
      params
    });
  }
  const multipleInterfaceName = makeUnique(capitalize(tableName) + 'Queries');
  const singularInterfaceName = makeUnique(capitalize(pluralize.singular(tableName)) + 'Queries');
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
  for (const name of Object.keys(db.interfaces)) {
    typeSet.add(name);
  }
  const tables = Object.entries(db.tables).map(([key, value]) => ({ name: key, columns: value }));
  let types = '';
  if (/\.d\.ts/.test(destinationPath)) {
    types += `import Database from 'flyweightjs';\n\n`;
  }
  types += definitions;
  types += '\n\n';
  if (options.interfaces) {
    types += options.interfaces.trim();
    types += '\n\n';
  }
  const returnTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const capitalized = capitalize(singular);
    const interfaceName = makeUnique(capitalized);
    const insertInterfaceName = makeUnique(`Insert${interfaceName}`);
    const whereInterfaceName = makeUnique(`Where${interfaceName}`);
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
      }, db.customTypes, db.interfaces);
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
      }, db.customTypes, db.interfaces);
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
      }, db.customTypes, db.interfaces);
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
      }, db.customTypes, db.interfaces);
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
  const interfaceName = options.interfaceName || 'TypedDb';
  types += `export interface ${interfaceName} {\n`;
  types += '  [key: string]: any,\n';
  for (const returnType of returnTypes) {
    types += returnType + ',\n';
  }
  types += '  begin(): Promise<void>,\n';
  types += '  commit(): Promise<void>,\n';
  types += '  rollback(): Promise<void>,\n';
  types += `  getTransaction(): Promise<${interfaceName}>,\n`;
  types += `  release(transaction: ${interfaceName}): void`;
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
  createTypes,
  parseExtractor
}
