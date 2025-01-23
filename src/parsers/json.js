const sample = (items, count) => {
  const size = Math.min(items.length, count);
  const sorted = [...items].sort(() => 0.5 - Math.random());
  return sorted.slice(0, size);
}

class ValueType {
  constructor(type) {
    this.type = type;
  }

  equals(other) {
    if (other instanceof ValueType && other.type === this.type) {
      return true;
    }
    return false;
  }

  toString() {
    return this.type;
  }
}

class ArrayType {
  constructor(types) {
    this.types = types;
  }

  equals(other) {
    if (!other instanceof ArrayType) {
      return false;
    }
    let count = 0;
    for (const type of other.types) {
      const found = this.types.find(t => t.equals(type));
      if (found) {
        count++;
      }
    }
    if (count !== other.types.length) {
      return false;
    }
    count = 0;
    for (const type of this.types) {
      const found = other.types.find(t => t.equals(type));
      if (found) {
        count++;
      }
    }
    if (count !== this.types.length) {
      return false;
    }
    return true;
  }

  toString() {
    return `Array<${this.types.map(t => t.toString()).join(' | ')}>`;
  }
}

class UndefinedType {
  equals(other) {
    return other instanceof UndefinedType;
  }
}

class ObjectType {
  constructor(className, properties) {
    this.className = className;
    this.properties = properties;
  }

  equals(other) {
    if (!other instanceof ObjectType) {
      return false;
    }
    const keys = Object.keys(this.properties);
    const otherKeys = Object.keys(other);
    if (keys.some(k => !otherKeys.includes(k))) {
      return false;
    }
    if (otherKeys.some(k => !keys.includes(k))) {
      return false;
    }
    for (const [key, types] of Object.entries(this.properties)) {
      const otherTypes = other[key];
      for (const otherType of otherTypes) {
        if (!types.find(t => t.equals(otherType))) {
          return false;
        }
      }
      for (const type of types) {
        if (!otherTypes.find(t => t.equals(type))) {
          return false;
        }
      }
    }
    return true;
  }

  merge(other) {
    const keys = Object.keys(this.properties);
    const otherKeys = Object.keys(other);
    const notOther = keys.filter(k => !otherKeys.includes(k));
    const notExisting = otherKeys.filter(k => !keys.includes(k));
    for (const key of notOther) {
      this.properties[key].push(new UndefinedType());
    }
    for (const key of notExisting) {
      this.properties[key] = [new UndefinedType()];
      this.properties[key].push(...other[key]);
    }
  }

  toString() {
    return this.className;
  }
}

const parse = (value, parsed) => {
  const type = value === null ? 'null' : typeof value;
  if (type !== 'object') {
    parsed.push({ category: 'value', types: [type] });
    return parsed;
  }
  if (Array.isArray(value)) {
    const items = sample(value, 10);
    const valueTypes = new Set(items.map(item => item === null ? 'null' : typeof item));
    if (!valueTypes.has('object')) {
      const types = Array.from(valueTypes.values());
      parsed.push({ category: 'array', types });
      return parsed;
    }
    const properties = {};
    for (const item of items) {
      const itemKeys = Object.keys(item);
      const existingKeys = Object.keys(properties);
      const missing = existingKeys.filter(k => !itemKeys.includes(k));
      for (const key of missing) {
        properties[key].push({ category: 'undefined' });
      }
      for (const [key, value] of Object.entries(item)) {
        const types = [];
        parse(value, types);
        if (!properties[key]) {
          properties[key] = [];
        }
        properties[key].push(...types);
      }
    }
    const adjusted = {};
    for (const [key, types] of Object.entries(properties)) {
      const unique = [];
      for (const type of types) {

      }
    }
    parsed.push(adjusted);
    return parsed;
  }
  else {
    const properties = {};
    for (const [key, item] of Object.entries(value)) {
      const types = [];
      parse(item, types);
      properties[key] = types.at(0);
    }
    parsed.push(properties);
    return parsed;
  }
}

const social = {
  instagram: 'strickland',
  tiktok: 'realstrickland',
  youtube: {
    main: 'stricklandmma',
    secondary: 'stricklandpodcast'
  },
  posts: [
    {
      date: 13982424,
      content: 'this is a test'
    },
    {
      date: 2498114,
      content: 'what is happening here'
    }
  ]
};
const parsed = [];
parse(social, parsed);
console.log(parsed.at(0));
