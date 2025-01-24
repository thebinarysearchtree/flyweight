const sample = (items, count) => {
  const size = Math.min(items.length, count);
  const sorted = [...items].sort(() => 0.5 - Math.random());
  return sorted.slice(0, size);
}

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

class ValueType {
  constructor(type) {
    this.name = 'ValueType';
    this.type = type;
  }

  equals(other) {
    if (other instanceof ValueType && other.type === this.type) {
      return true;
    }
    return false;
  }

  getInterfaces() {
    return [];
  }

  toString() {
    return this.type;
  }
}

class TupleType {
  constructor(types) {
    this.name = 'TupleType';
    this.types = types;
  }

  equals(other) {
    if (!other instanceof TupleType) {
      return false;
    }
    if (this.types.length !== other.types.length) {
      return false;
    }
    for (let i = 0; i < this.types.length; i++) {
      const existingType = this.types[i];
      const otherType = other.types[i];
      if (!existingType.equals(otherType)) {
        return false;
      }
    }
    return true;
  }

  getInterfaces() {
    return [];
  }

  toString() {
    return `[${this.types.map(t => t.toString()).join(', ')}]`;
  }
}

class ArrayType {
  constructor(types) {
    this.name = 'ArrayType';
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

  merge(other) {
    const existingNames = this.types.map(t => t.name);
    const existingValues = this.types.filter(t => t.name === 'ValueType').map(t => t.type);
    const needsAdding = other.types.filter(t => !existingNames.includes(t.name));
    this.types.push(...needsAdding);
    const otherValues = other.types
      .filter(t => t.name === 'ValueType')
      .filter(t => !existingValues.includes(t.type))
      .filter(t => !needsAdding.includes(t));
    this.types.push(...otherValues);
    const objectType = this.types.find(t => t.name === 'ObjectType' && !needsAdding.includes(t));
    const otherObject = other.types.find(t => t.name === 'ObjectType' && !needsAdding.includes(t));
    if (objectType && otherObject) {
      objectType.merge(otherObject);
    }
  }

  getInterfaces() {
    const interfaces = [];
    for (const type of this.types) {
      interfaces.push(...type.getInterfaces());
    }
    return interfaces;
  }

  toString() {
    return `Array<${this.types.map(t => t.toString()).join(' | ')}>`;
  }
}

class UndefinedType {
  constructor() {
    this.name = 'UndefinedType';
  }

  equals(other) {
    return other instanceof UndefinedType;
  }

  getInterfaces() {
    return [];
  }

  toString() {
    return 'undefined';
  }
}

class AnyType {
  constructor() {
    this.name = 'AnyType';
  }

  equals(other) {
    return other instanceof AnyType;
  }

  getInterfaces() {
    return [];
  }

  toString() {
    return 'any';
  }
}

class ObjectType {
  constructor(className, properties) {
    this.name = 'ObjectType';
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
    const otherKeys = Object.keys(other.properties);
    const notOther = keys.filter(k => !otherKeys.includes(k));
    const notExisting = otherKeys.filter(k => !keys.includes(k));
    for (const key of notOther) {
      this.properties[key].push(new UndefinedType());
    }
    for (const key of notExisting) {
      this.properties[key] = [new UndefinedType()];
      this.properties[key].push(...other.properties[key]);
    }
    for (const [key, types] of Object.entries(this.properties)) {
      const otherTypes = other.properties[key];
      const existingTypes = types.map(t => t.name);
      const existingValues = types.filter(t => t.name === 'ValueType').map(t => t.type);
      const needsAdding = otherTypes.filter(t => !existingTypes.includes(t.name));
      types.push(...needsAdding);
      const otherValues = otherTypes
        .filter(t => t.name === 'ValueType')
        .filter(t => !existingValues.includes(t.type))
        .filter(t => !needsAdding.includes(t));
      types.push(...otherValues);
      const objectType = types.find(t => t.name === 'ObjectType' && !needsAdding.includes(t));
      const otherObject = otherTypes.find(t => t.name === 'ObjectType');
      if (objectType && otherObject) {
        objectType.merge(otherObject);
      }
    }
  }

  getInterface() {
    const entries = Object.entries(this.properties);
    if (entries.length === 0) {
      return '';
    }
    let interfaceString = `interface ${this.className} {\n`;
    for (const [key, types] of entries) {
      interfaceString += `  ${key}: ${types.map(t => t.toString()).join(' | ')},\n`;
    }
    return `${interfaceString.slice(0, -2)}\n}`;
  }

  getInterfaces() {
    const existing = this.getInterface();
    const interfaces = [existing];
    for (const types of Object.values(this.properties)) {
      for (const type of types) {
        interfaces.push(...type.getInterfaces());
      }
    }
    return interfaces;
  }

  toString() {
    return this.className;
  }
}

const createObjectType = (className, item) => {
  const properties = {};
  for (const [key, value] of Object.entries(item)) {
    const tree = {
      root: {},
      className: `${className}${capitalize(key)}`
    };
    parse(value, tree);
    properties[key] = [tree.root];
  }
  return new ObjectType(className, properties);
}

const parse = (value, branch) => {
  const type = value === null ? 'null' : typeof value;
  if (type !== 'object') {
    branch.root = new ValueType(type);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      const type = new AnyType();
      branch.root = new ArrayType([type]);
      return;
    }
    const items = sample(value, 10);
    const valueTypes = new Set(items.map(item => item === null ? 'null' : typeof item));
    if (!valueTypes.has('object')) {
      const types = Array.from(valueTypes.values()).map(t => new ValueType(t));
      branch.root = new ArrayType(types);
      return;
    }
    if (!items.some(item => !Array.isArray(item))) {
      const lengths = items.map(item => item.length);
      const unique = new Set(lengths);
      if (unique.size === 1) {
        const types = [];
        for (const item of items) {
          for (const element of item) {
            types.push(typeof element);
          }
        }
        const unique = new Set(types);
        const type = types.at(0);
        if (unique.size === 1 && type !== 'object') {
          const tuple = new TupleType(type);
          branch.root = new ArrayType([tuple]);
          return;
        }
        if (!types.includes('object')) {
          const valueTypes = Array.from(unique.values());
          const types = valueTypes.map(t => new ValueType(t));
          const arrayType = new ArrayType(types);
          branch.root = new ArrayType(arrayType);
          return;
        }
      }
      const type = new AnyType();
      branch.root = new ArrayType([type]);
      return;
    }
    const objectTypes = [];
    for (const item of items) {
      const type = createObjectType(branch.className, item);
      objectTypes.push(type);
    }
    const sampleObject = objectTypes.at(0);
    if (objectTypes.length > 1) {
      const types = objectTypes.slice(1);
      for (const type of types) {
        sampleObject.merge(type);
      }
    }
    branch.root = new ArrayType([sampleObject]);
    return;
  }
  else {
    const type = createObjectType(branch.className, value);
    branch.root = type;
    return;
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
const tree = {
  root: {},
  className: 'FighterSocial'
};
parse(social, tree);
console.log(tree.root.toString());
const interfaces = tree.root.getInterfaces();
for (const interfaceString of interfaces) {
  console.log(interfaceString);
}