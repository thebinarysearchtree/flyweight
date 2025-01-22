const sample = (items, count) => {
  const size = Math.min(items.length, count);
  const sorted = [...items].sort(() => 0.5 - Math.random());
  return sorted.slice(0, size);
}

const parse = (className, value, parsed) => {
  const type = value === null ? 'null' : typeof value;
  if (type !== 'object') {
    parsed.push(type);
    return parsed;
  }
  if (Array.isArray(value)) {
    const items = sample(value);
    const valueTypes = new Set(items.map(item => item === null ? 'null' : typeof item));
    if (!valueTypes.has('object')) {
      const type = Array<`${Array.from(valueTypes.keys).join(' | ')}>;`;
      parsed.push(type);
      return parsed;
    }
    const type = `Array<${className}>;`;
    parsed.push(type);
    let interface = `interface ${className} {\n`;
    const properties = {};
    for (const item of items) {
      const itemKeys = Object.keys(item);
      const existingKeys = Object.keys(properties);
      const missing = existingKeys.filter(k => !itemKeys.includes(k));
      for (const key of missing) {
        properties[key].push('undefined');
      }
      for (const [key, value] of Object.entries(item)) {
        const typeName = `${className}${key}`;
        const types = parse(typeName, value, []);
        if (!properties[key]) {
          properties[key] = [];
        }
        properties[key].push(...types);
      }
    }
    for (const [key, types] of Object.entries(properties)) {
      const unique = new Set(types);
      const type = Array.from(unique.keys).join(' | ');
      interface += `  ${key}: ${type},\n`;
    }
    interface = `${interface.slice(0, -2)}\n}`;
    parsed.push(interface);
    return parsed;
  }
}