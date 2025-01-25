import pluralize from 'pluralize';

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
    if (!(other instanceof TupleType)) {
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
    if (!(other instanceof ArrayType)) {
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
    this.types = mergeTypes(this.types, other.types);
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
    if (!(other instanceof ObjectType)) {
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
      if (!this.properties[key].find(t => t.name === 'UndefinedType')) {
        this.properties[key].push(new UndefinedType());
      }
    }
    for (const key of notExisting) {
      this.properties[key] = [new UndefinedType()];
      this.properties[key].push(...other.properties[key].filter(t => t.name !== 'UndefinedType'));
    }
    for (const [key, types] of Object.entries(this.properties)) {
      const otherTypes = other.properties[key] || [];
      this.properties[key] = mergeTypes(types, otherTypes);
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
    let singular = pluralize.singular(key);
    if (properties.hasOwnProperty(singular)) {
      singular = key;
    }
    const tree = {
      root: {},
      className: `${className}${capitalize(singular)}`
    };
    parse(value, tree);
    properties[key] = [tree.root];
  }
  return new ObjectType(className, properties);
}

const mergeTypes = (into, from) => {
  if (into.find(t => t.name === 'AnyType') || from.find(t => t.name === 'AnyType')) {
    const type = new AnyType();
    return [type];
  }
  const existingNames = into.map(t => t.name);
  const existingValues = into.filter(t => t.name === 'ValueType').map(t => t.type);
  const needsAdding = from.filter(t => !existingNames.includes(t.name));
  into.push(...needsAdding);
  const otherValues = from
    .filter(t => t.name === 'ValueType')
    .filter(t => !existingValues.includes(t.type))
    .filter(t => !needsAdding.includes(t));
  into.push(...otherValues);
  const objectType = into.find(t => t.name === 'ObjectType' && !needsAdding.includes(t));
  const otherObject = from.find(t => t.name === 'ObjectType' && !needsAdding.includes(t));
  if (objectType && otherObject) {
    objectType.merge(otherObject);
  }
  const arrayTypes = ['ArrayType', 'TupleType'];
  const arrayType = into.find(t => arrayTypes.includes(t.name) && !needsAdding.includes(t));
  const otherArrayType = from.find(t => arrayTypes.includes(t.name));
  if (!arrayType || !otherArrayType) {
    if (into.length > 3) {
      return [new AnyType()];
    }
    return into;
  }
  if (arrayType.name !== otherArrayType.name) {
    const keep = [arrayType, otherArrayType].find(t => t.name === 'ArrayType');
    if (!into.includes(keep)) {
      this.push(keep);
    }
    into = into.filter(t => t.name !== 'TupleType');
  }
  else {
    if (arrayType.name === 'TupleType' && !arrayType.equals(otherArrayType)) {
      const types = arrayType.types;
      const existing = new Set();
      const unique = [];
      for (const type of types) {
        if (!existing.has(type.type)) {
          unique.push(type);
          existing.add(type.type);
        }
      }
      const arrayType = new ArrayType(unique);
      into.push(arrayType);
      into = into.filter(t => !t.name === 'TupleType');
    }
    else if (arrayType.name === 'ArrayType') {
      arrayType.merge(otherArrayType);
    }
  }
  if (into.length > 3) {
    return [new AnyType()];
  }
  return into;
}

const parse = (value, branch) => {
  const type = value === null ? 'null' : typeof value;
  if (type !== 'object') {
    branch.root = new ValueType(type);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      branch.root = new ArrayType([]);
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
            types.push(element === null ? 'null' : typeof element);
          }
        }
        const unique = new Set(types);
        const type = types.at(0);
        if (unique.size === 1 && type !== 'object') {
          const valueTypes = items.at(0).map(t => new ValueType(typeof t));
          const tuple = new TupleType(valueTypes);
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
      else {
        const types = [];
        for (const item of items) {
          for (const element of item) {
            types.push(typeof element);
          }
        }
        const unique = new Set(types);
        if (!types.includes('object')) {
          const valueTypes = Array.from(unique.values());
          const types = valueTypes.map(t => new ValueType(t));
          const arrayType = new ArrayType(types);
          branch.root = new ArrayType([arrayType]);
          return;
        }
      }
      const type = new AnyType();
      const arrayType = new ArrayType([type]);
      branch.root = new ArrayType([arrayType]);
      return;
    }
    else if (items.some(item => item === null || typeof item !== 'object')) {
      const valueTypes = items
        .filter(t => t === null || typeof t !== 'object')
        .map(t => t === null ? 'null' : typeof t)
        .map(t => new ValueType(t));
      const otherTypes = items.filter(t => t !== null && typeof t === 'object');
      let types = [];
      for (const value of otherTypes) {
        const tree = {
          root: {},
          className: branch.className
        };
        parse(value, tree);
        if (!types.find(t => t.equals(tree.root))) {
          types = mergeTypes(types, [tree.root]);
        }
      }
      for (const type of valueTypes) {
        if (!types.find(t => t.equals(type))) {
          types = mergeTypes(types, [type]);
        }
      }
      branch.root = new ArrayType(types);
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
      content: 'this is a test',
      shape: [[1, 3], [2, 4], [7, 9]]
    },
    {
      date: 2498114,
      shape: [[4, 1], [6, 23], [3, 4]]
    }
  ]
};
const simple = [
  {
    dog: 'asfasf'
  },
  {
    instagram: 'asfasf'
  },
  {
    instagram: 'asfasf asfasf asf'
  },
  {
    instagram: 'asfasf'
  },
  {
    dog: 3
  },
  {
    instagram: 'asfasf'
  }
]
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