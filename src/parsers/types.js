import { parseQuery } from './queries.js';
import { renameColumns } from '../map.js';
import { makeOptions } from '../proxy.js';
import { blank } from './utils.js';
import definitions from './files.js';
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

const makeOverloads = (queryName, paramsName, returnName) => {
  let append = '';
  const items = [];
  if (paramsName) {
    items.push(paramsName);
    append += 'Params';
  }
  const generics = items
    .map(s => `${s}, `)
    .join('');
  const overloads = [];
  overloads.push(`${queryName}<U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryInclude${append}<${generics}ToWhere<${returnName}>, ${returnName}, U>): Promise<Array<MergeIncludes<${returnName}, U>>>`);
  overloads.push(`${queryName}<K extends keyof ${returnName}, U extends Includes<TypedDb, ${returnName}>>(query: ComplexSqlQueryObjectInclude${append}<${generics}ToWhere<${returnName}>, K, ${returnName}, U>): Promise<Array<MergeIncludes<Pick<${returnName}, K>, U>>>`);
  return overloads;
}

const hasNull = (tsType) => {
  return tsType
    .split('|')
    .map(t => t.trim())
    .some(t => t === 'null');
}

const removeOptional = (tsType) => tsType.replace(/ \| optional$/, '');

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
  let tsType;
  const { type, notNull, isOptional } = column;
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
      const params = parseParams(sql);
      const columns = parseQuery(sql, db.tables);
      const singular = pluralize.singular(tableName);
      const interfaceName = makeUnique(capitalize(singular) + capitalize(queryName), typeSet, i);
      let paramsName;
      let paramsString;
      if (params.length > 0) {
        paramsName = `${interfaceName}Params`;
        paramsString = `interface ${paramsName} {\n`;
        for (const param of params) {
          paramsString += `  ${param}: any;\n`;
        }
        paramsString += '}\n';
      }
      if (columns.length === 0) {
        parsedQueries.push({
          queryName,
          paramsName,
          paramsString,
          params
        });
        continue;
      }
      let interfaceString = `interface ${interfaceName} {\n`;
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
        params
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
  let interfaceString = `interface ${interfaceName} {\n`;
  for (const query of parsedQueries) {
    const {
      queryName,
      interfaceName,
      paramsName,
      params
    } = query;
    if (!interfaceName) {
      let argument = '';
      if (params.length > 0) {
        argument += 'options: SqlQuery';
      }
      if (params.length > 0) {
        argument += 'Params';
      }
      interfaceString += `  ${queryName}(${argument}): Promise<void>;\n`;
      continue;
    }
    else {
      const overloads = makeOverloads(queryName, paramsName, interfaceName);
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
  return {
    interfaceName,
    interfaceString,
    queryInterfaces,
    paramsInterfaces
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
  const typeSet = new Set();
  let i = 1;
  const matches = definitions.matchAll(/^(export )?(default )?(declare )?(interface|class) (?<name>[a-z0-9_]+)/gmi);
  for (const match of matches) {
    typeSet.add(match.groups.name);
  }
  const tables = Object.entries(db.tables).map(([key, value]) => ({ name: key, columns: value }));
  let types = '';
  const returnTypes = [];
  let jsonTypes;
  try {
    const saved = await fileSystem.readFile(jsonPath, 'utf8');
    jsonTypes = new Map(JSON.parse(saved));
  }
  catch {
    jsonTypes = new Map();
  }
  const jsonColumnTypes = new Map();
  let tableInterfaces = 'interface Tables {\n';
  for (const table of tables) {
    const isView = db.viewSet.has(table.name);
    const singular = pluralize.singular(table.name);
    const capitalized = capitalize(singular);
    const interfaceName = makeUnique(capitalized, typeSet, i);
    tableInterfaces += `  ${table.name}: ToDbInterface<${interfaceName}>;\n`;
    const insertInterfaceName = makeUnique(`Insert${interfaceName}`, typeSet, i);
    let computedInterfaceName;
    const computed = db.computed.get(table.name);
    if (!computed) {
      computedInterfaceName = 'unknown';
    }
    else {
      computedInterfaceName = makeUnique(`Computed${interfaceName}`, typeSet, i);
    }
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
    if (isView) {
      returnType = `  ${table.name}: Pick<Queries<${interfaceName}, undefined, ToWhere<${interfaceName} & ${computedInterfaceName}>, ${computedInterfaceName}, undefined, TypedDb>, 'get' | 'many' | 'query' | 'first' | 'groupBy' | 'count' | 'avg' | 'min' | 'max' | 'sum'>`;
    }
    else if (db.virtualSet.has(table.name)) {
      returnType = `  ${table.name}: VirtualQueries<${interfaceName}, ToWhere<${interfaceName} & ${computedInterfaceName}>>`;
    }
    else {
      returnType = `  ${table.name}: Queries<${interfaceName}, ${insertInterfaceName}, ToWhere<${interfaceName} & ${computedInterfaceName}>, ${computedInterfaceName}, ${tsType}, TypedDb>`;
    }
    let queries;
    if (sqlDir) {
      queries = await getQueries(fileSystem, db, sqlDir, table.name, typeSet, i);
      if (queries) {
        returnType += ` & ${queries.interfaceName}`;
      }
    }
    returnType += ';\n';
    returnTypes.push(returnType);
    const jsonInterfaces = [];
    types += `interface ${interfaceName} {\n`;
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
        jsonColumnTypes.set(key, tsType);
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
    if (!isView) {
      types += `interface ${insertInterfaceName} {\n`;
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
    }
    if (computed) {
      types += `interface ${computedInterfaceName} {\n`;
      for (const [name, item] of computed.entries()) {
        const tsType = item.tsType;
        types += `  ${name}: ${tsType};\n`;
      }
      types += '}\n\n';
    }
    if (queries) {
      const interfaces = [...queries.queryInterfaces, ...queries.paramsInterfaces];
      for (const queryInterface of interfaces) {
        types += queryInterface;
        types += '\n';
      }
      types += queries.interfaceString;
      types += '\n';
    }
  }
  tableInterfaces += '}';
  types += definitions;
  types = types.replace(/^interface Tables \{[^\}]+}/m, tableInterfaces);
  types = types.replace(/(interface TypedDb {\n  \[key: string\]: any;\s)/, `$1${returnTypes.join('')}`)
  types = types.replace(/^interface [a-z]+Database \{[^\}]+}\n\n/mi, '');
  if (db.name === 'turso') {
    types = types.replace('export const database: SQLiteDatabase;', 'export const database: TursoDatabase;');
  }

  await fileSystem.writeFile(destinationPath, types, 'utf8');
  if (sampleData) {
    await fileSystem.writeFile(jsonPath, JSON.stringify(Array.from(jsonTypes)), 'utf8');
  }
}

export {
  createTypes,
  parseParams
}
