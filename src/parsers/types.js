import { parseQuery } from './queries.js';
import { renameColumns } from '../map.js';
import { makeOptions } from '../proxy.js';
import { blank } from './utils.js';
import { preprocess } from './preprocessor.js';
import files from './files.js';
import pluralize from 'pluralize';
import getTypes from './json.js';

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

const makeOverloads = (queryName, paramsName, unsafeName, returnName) => {
  let append = '';
  const items = [];
  if (paramsName) {
    items.push(paramsName);
    append += 'Params';
  }
  if (unsafeName) {
    items.push(unsafeName);
    append += 'Unsafe';
  }
  const generics = items
    .map(s => `${s}, `)
    .join('');
  const overloads = [];
  overloads.push(`${queryName}<U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryInclude${append}<${generics}ToWhere<${returnName}>, ${returnName}, U>): Promise<Array<MergeIncludes<${returnName}, U>>>`);
  overloads.push(`${queryName}<U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryInclude${append}Debug<${generics}ToWhere<${returnName}>, ${returnName}, U>): Promise<DebugResult<Array<MergeIncludes<${returnName}, U>>>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}, U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryObjectInclude${append}<${generics}ToWhere<${returnName}>, K, ${returnName}, U>): Promise<Array<MergeIncludes<Pick<${returnName}, K>, U>>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}, U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryObjectInclude${append}Debug<${generics}ToWhere<${returnName}>, K, ${returnName}, U>): Promise<DebugResult<Array<MergeIncludes<Pick<${returnName}, K>, U>>>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}, U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryObjectIncludeOmit${append}<${generics}ToWhere<${returnName}>, K, ${returnName}, U>): Promise<Array<MergeIncludes<Omit<${returnName}, K>, U>>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}, U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryObjectIncludeOmit${append}Debug<${generics}ToWhere<${returnName}>, K, ${returnName}, U>): Promise<DebugResult<Array<MergeIncludes<Omit<${returnName}, K>, U>>>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}>(query: ComplexSqlQueryValue${append}<${generics}ToWhere<${returnName}>, K, ${returnName}>): Promise<Array<${returnName}[K]>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}>(query: ComplexSqlQueryValue${append}Debug<${generics}ToWhere<${returnName}>, K, ${returnName}>): Promise<DebugResult<Array<${returnName}[K]>>>`);
  overloads.push(`${queryName}<N>(query: ComplexSqlQuerySelector${append}<${generics}ToWhere<${returnName}>, ${returnName}, N>): Promise<Array<N>>`);
  overloads.push(`${queryName}<N>(query: ComplexSqlQuerySelector${append}Debug<${generics}ToWhere<${returnName}>, ${returnName}, N>): Promise<DebugResult<Array<N>>>`);
  return overloads;
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
  return parsePattern(sql, /(\s|,|\()\$(?<param>[a-z0-9_]+)(\s|,|\)|;|$)/gmi);
}

const parseUnsafe = (sql) => {
  return parsePattern(sql, /(\s|,|\()\$\{(?<param>[a-z0-9_]+)\}(\s|,|\)|;|$)/gmi);
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

const getQueries = async (fileSystem, db, sqlDir, tableName, typeSet, i) => {
  const path = fileSystem.join(sqlDir, tableName);
  let fileNames;
  try {
    fileNames = await fileSystem.readdir(path);
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
    const queryPath = fileSystem.join(path, fileName);
    let sql = await fileSystem.readFile(queryPath, 'utf8');
    if (sql.endsWith(';')) {
      sql = sql.substring(0, sql.length - 1);
    }
    try {
      sql = preprocess(sql, db.tables);
      const params = parseParams(sql);
      const unsafe = parseUnsafe(sql);
      const columns = parseQuery(sql, db.tables);
      const singular = pluralize.singular(tableName);
      const interfaceName = makeUnique(capitalize(singular) + capitalize(queryName), typeSet, i);
      let paramsName;
      let paramsString;
      if (params.length > 0) {
        paramsName = `${interfaceName}Params`;
        paramsString = `export interface ${paramsName} {\n`;
        for (const param of params) {
          paramsString += `  ${param}: any;\n`;
        }
        paramsString += '}\n';
      }
      let unsafeName;
      let unsafeString;
      if (unsafe.length > 0) {
        unsafeName = `${interfaceName}Unsafe`;
        unsafeString = `export interface ${unsafeName} {\n`;
        for (const param of unsafe) {
          unsafeString += `  ${param}: any;\n`;
        }
        unsafeString += '}\n';
      }
      if (columns.length === 0) {
        parsedQueries.push({
          queryName,
          paramsName,
          paramsString,
          params,
          unsafeName,
          unsafeString,
          unsafe
        });
        continue;
      }
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
        paramsName,
        paramsString,
        params,
        unsafeName,
        unsafeString,
        unsafe
      });
    }
    catch (e) {
      if (db.debug) {
        throw e;
      }
      let message = `Could not parse ${fileName} in "${tableName}" folder.\n`;
      try {
        await db.getError(sql);
      }
      catch (e) {
        message += e.message;
        message += `\n${sql}`;
      }
      throw Error(message);
    }
  }
  const singular = pluralize.singular(tableName);
  const interfaceName = makeUnique(capitalize(singular) + 'Queries', typeSet, i);
  let interfaceString = `export interface ${interfaceName} {\n`;
  for (const query of parsedQueries) {
    const {
      queryName,
      interfaceName,
      paramsName,
      params,
      unsafeName,
      unsafe
    } = query;
    if (!interfaceName) {
      let argument = '';
      if (params.length > 0 || unsafe.length > 0) {
        argument += 'options: SqlQuery';
      }
      if (params.length > 0) {
        argument += 'Params';
      }
      if (unsafe.length > 0) {
        argument += 'Unsafe';
      }
      interfaceString += `  ${queryName}(${argument}): Promise<void>;\n`;
      continue;
    }
    else {
      const overloads = makeOverloads(queryName, paramsName, unsafeName, interfaceName);
      for (const overload of overloads) {
        interfaceString += `  ${overload};\n`;
      }
    }
  }
  interfaceString += `}\n`;
  const queryInterfaces = parsedQueries
    .filter(q => q.interfaceString !== undefined)
    .map(q => q.interfaceString);
  const paramsInterfaces = parsedQueries
    .filter(p => p.paramsString !== undefined)
    .map(p => p.paramsString);
  const unsafeInterfaces = parsedQueries
    .filter(p => p.unsafeString !== undefined)
    .map(p => p.unsafeString);
  return {
    interfaceName,
    interfaceString,
    queryInterfaces,
    paramsInterfaces,
    unsafeInterfaces
  }
}

const createTypes = async (options) => {
  const {
    db,
    sqlDir,
    destinationPath,
    fileSystem,
    sampleData,
    jsonPath
  } = options;
  const features = db.supports;
  let index = files.index;
  index = index.replace(/export \{[^\}]+\}/, '');
  index = index.replace('getClient<T>(): T; ', 'getClient(): TypedDb; ');
  const definitions = files.interfaces;
  const typeSet = new Set();
  let i = 1;
  const matches = (index + '\n' + definitions).matchAll(/^(export )?(default )?(interface|class) (?<name>[a-z0-9_]+)/gmi);
  for (const match of matches) {
    typeSet.add(match.groups.name);
  }
  const tables = Object.entries(db.tables).map(([key, value]) => ({ name: key, columns: value }));
  let types = `${index}\n${definitions}\n\n`;
  const returnTypes = [];
  let jsonTypes;
  try {
    const saved = await fileSystem.readFile(jsonPath, 'utf8');
    jsonTypes = new Map(JSON.parse(saved));
  }
  catch {
    jsonTypes = new Map();
  }
  const defineTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const capitalized = capitalize(singular);
    const interfaceName = makeUnique(capitalized, typeSet, i);
    const insertInterfaceName = makeUnique(`Insert${interfaceName}`, typeSet, i);
    const whereInterfaceName = makeUnique(`Where${interfaceName}`, typeSet, i);
    defineTypes.push([table.name, whereInterfaceName]);
    let returnType;
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
      returnType = `  ${table.name}: Pick<Queries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}, undefined, TypedDb>, 'get' | 'many' | 'query' | 'first'>`;
    }
    else if (db.virtualSet.has(table.name)) {
      returnType = `  ${table.name}: VirtualQueries<${interfaceName}, ${whereInterfaceName}>`;
    }
    else {
      returnType = `  ${table.name}: Queries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}, ${tsType}, TypedDb>`;
    }
    let queries;
    if (sqlDir) {
      queries = await getQueries(fileSystem, db, sqlDir, table.name, typeSet, i);
      if (queries) {
        returnType += ` & ${queries.interfaceName}`;
      }
    }
    returnType += ` & DefineQuery<DefineJoin, ${interfaceName}>`;
    returnType += ';\n';
    returnTypes.push(returnType);
    const jsonInterfaces = [];
    types += `export interface ${interfaceName} {\n`;
    for (const column of table.columns) {
      const { name, type, primaryKey, notNull } = column;
      let tsType = toTsType({
        type,
        notNull: notNull || primaryKey
      }, db.customTypes);
      if (type === 'json') {
        const key = `${table.name} ${name}`;
        if (sampleData) {
          const sample = await db.getSample(table.name, name);
          const types = getTypes(name, sample, typeSet);
          tsType = tsType.replace('Json', types.columnType);
          const unique = new Set(tsType.split('|').map(s => s.trim()));
          tsType = Array.from(unique.values()).join(' | ');
          if (tsType.endsWith(' | null | null')) {
            tsType = tsType.slice(0, -7);
          }
          jsonInterfaces.push(...types.interfaces);
          jsonTypes.set(key, types);
        }
        else {
          const existing = jsonTypes.get(key);
          if (existing) {
            tsType = tsType.replace('Json', existing.columnType);
            const unique = new Set(tsType.split('|').map(s => s.trim()));
            tsType = Array.from(unique.values()).join(' | ');
            jsonInterfaces.push(...existing.interfaces);
          }
        }
      }
      let property = `  ${name}`;
      property += ': ';
      property += tsType;
      property += ';\n';
      types += property;
    }
    types += '}\n\n';
    if (jsonInterfaces.length > 0) {
      types += jsonInterfaces.join('\n\n');
      types += '\n\n';
    }
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
      let property = `  ${name}`;
      property += '?: ';
      if (tsType === 'Json') {
        const saved = jsonTypes.get(`${table.name} ${name}`);
        const whereType = saved ? saved.columnType : tsType;
        property += `WhereFunction<${whereType}>`;
      }
      else {
        property += tsType;
        property += ` | Array<${tsType}> | WhereFunction<${tsType}>`;
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
    types += `  and?: Array<${whereInterfaceName}>;\n`;
    types += `  or?: Array<${whereInterfaceName}>;\n`;
    types += '}\n\n';
    if (queries) {
      const interfaces = [...queries.queryInterfaces, ...queries.paramsInterfaces, ...queries.unsafeInterfaces];
      for (const queryInterface of interfaces) {
        types += queryInterface;
        types += '\n';
      }
      types += queries.interfaceString;
      types += '\n';
    }
  }
  types += `export interface DefineJoin {\n`;
  for (const [table, where] of defineTypes) {
    types += `  ${table}: DefineWhere<${where}>;\n`;
  }
  types += '}\n\n';
  types = types.replace('getClient(): any;', 'getClient(): TypedDb;');
  const exportSection = files[features.types];
  const replaced = exportSection.replace(/(\[key: string\]: any;\s)/, `$1${returnTypes.join('')}`);
  types += replaced;

  await fileSystem.writeFile(destinationPath, types, 'utf8');
  if (sampleData) {
    await fileSystem.writeFile(jsonPath, JSON.stringify(Array.from(jsonTypes)), 'utf8');
  }
}

export {
  createTypes,
  parseParams
}
