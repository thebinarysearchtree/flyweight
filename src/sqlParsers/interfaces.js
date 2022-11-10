import { blank } from './utils.js';

const getType = (statement, optional) => {
  const tsType = statement + (optional ? ' | undefined' : '');
  if (/^\{.+\}$/.test(statement)) {
    statement = statement.substring(1, statement.length - 1);
    const properties = {};
    const matches = blank(statement, { open: '{', close: '}' }).matchAll(/(^| )(?<property>[^;,]+)(;|,|$)/gmid);
    for (const match of matches) {
      const [start, end] = match.indices.groups.property;
      const property = statement.substring(start, end).trim();
      const split = property.split(' ');
      const name = split[0].replace(/:|\?:/, '');
      optional = split[0].endsWith('?:');
      const type = getType(split.slice(1).join(' '), optional);
      properties[name] = type;
    }
    return { 
      objectProperties: properties,
      tsType
    };
  }
  if (/^[a-z0-9_]+$/i.test(statement)) {
    return {
      basicType: statement,
      tsType
    };
  }
  if (statement.startsWith('Array<') || statement.endsWith('[]')) {
    const blanked = blank(statement, { open: '<', close: '>' });
    const match = /^Array<(?<type>[^>]+)>$/md.exec(blanked);
    if (match) {
      const [start, end] = match.indices.groups.type;
      const type = statement.substring(start, end);
      return {
        arrayType: getType(type),
        tsType
      }
    }
    return {
      arrayType: getType(statement.substring(0, statement.length - 2)),
      tsType
    }
  }
  if (/^\[.+\]$/.test(statement)) {
    const types = [];
    statement = statement.substring(1, statement.length - 1);
    const matches = statement.matchAll(/(?<type>[^,]+)(,|$)/gmd);
    for (const match of matches) {
      types.push(getType(match.groups.type));
    }
    return {
      tupleTypes: types,
      tsType
    }
  }
}

const parseInterfaces = (declarations) => {
  const processed = declarations.replaceAll(/\s+/gm, ' ');
  const interfaces = {};
  const options = { open: '{', close: '}' };
  const typeMatches = blank(processed, options).matchAll(/(^| )export type (?<name>[a-z0-9_]+) = (?<type>.+?);(?= export|$)/gmid);
  for (const match of typeMatches) {
    const name = match.groups.name;
    const [start, end] = match.indices.groups.type;
    const type = processed.substring(start, end);
    interfaces[name.toLowerCase()] = getType(type);
  }
  const matches = blank(processed, options).matchAll(/(^| )export interface (?<name>[a-z0-9_]+)\s*(?<properties>{[^}]+})/gmid);
  for (const match of matches) {
    const name = match.groups.name;
    const [start, end] = match.indices.groups.properties;
    const properties = processed.substring(start, end);
    const adjusted = name.toLowerCase();
    interfaces[adjusted] = getType(properties);
  }
  return interfaces;
}

export {
  parseInterfaces
};
