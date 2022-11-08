const parseInterfaces = (declarations) => {
  const processed = declarations.replaceAll(/\s+/gm, ' ');
  const interfaces = {};
  const typeMatches = processed.matchAll(/(^| )export type (?<name>[a-z0-9_]+) = (?<type>[^;]+);/gmi);
  for (const match of typeMatches) {
    const { name, type } = match.groups;
    interfaces[name.toLowerCase()] = type;
  }
  const matches = processed.matchAll(/(^| )export interface (?<name>[a-z0-9_]+)\s*{(?<properties>[^}]+)}/gmi);
  for (const match of matches) {
    const { name, properties } = match.groups;
    if (properties.includes('{')) {
      continue;
    }
    const adjusted = name.toLowerCase();
    interfaces[adjusted] = {};
    const propertyMatches = properties.matchAll(/(?<statement>[^;]+)(;|$)/gmd);
    for (const propertyMatch of propertyMatches) {
      const statement = propertyMatch.groups.statement.trim();
      if (!statement) {
        continue;
      }
      const types = [];
      const split = statement.split(/\s+/);
      types.push(split.slice(1).map(s => s.replace(';', '')).join(' '));
      if (split[0].includes('?')) {
        types.push('undefined');
      }
      const propertyName = split[0].replace('?', '').replace(':', '');
      const type = types.join(' | ');
      interfaces[adjusted][propertyName] = type;
    }
  }
  return interfaces;
}

export {
  parseInterfaces
};
