import pluralize from 'pluralize';
import { readFile } from 'fs/promises';
import words from './words.js';

const sampleSize = 10 ** 2;
const usedNames = new Set();
const interfaceBodies = new Map();

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const camel = (word) => word.replace(/(?:_|\s)+([a-z])/g, (m, l) => l.toUpperCase());

const sample = (items) => {
  const size = Math.min(items.length, sampleSize);
  const sorted = [...items].sort(() => 0.5 - Math.random());
  return sorted.slice(0, size);
}

const typeSorter = (a, b) => {
  const order = ['string', 'number', 'boolean', 'other', 'null'];
  let aIndex = order.indexOf(a);
  if (aIndex === -1) {
    aIndex = 4;
  }
  let bIndex = order.indexOf(b);
  if (bIndex === -1) {
    bIndex = 4;
  }
  return aIndex - bIndex;
};

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

class EnumType {
  constructor(key, types) {
    this.name = 'EnumType';
    this.key = key;
    this.typeName = null;
    this.types = types;
  }

  equals(other) {
    if (!(other instanceof EnumType)) {
      return false;
    }
    if (this.types.length !== other.types.length) {
      return false;
    }
    return !this.types.some(t => !other.types.includes(t));
  }

  getInterfaces() {
    if (!this.typeName) {
      this.typeName = getTypeName(this.key);
    }
    const types = this.types.map(t => `'${t}'`).join(' | ') + ' | (string & {})';
    const interfaceString = `type ${this.typeName} = ${types}`;
    return [interfaceString];
  }

  toString() {
    if (!this.typeName) {
      this.typeName = getTypeName(this.key);
    }
    return this.typeName;
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
    let types = this.types
      .map(t => t.toString())
      .sort(typeSorter)
      .join(' | ');
    return types.includes('|') ? `Array<${types}>` : `${types}[]`;
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

class JsonType {
  constructor() {
    this.name = 'JsonType';
  }

  equals(other) {
    return other instanceof JsonType;
  }

  getInterfaces() {
    return [];
  }

  toString() {
    return 'Json';
  }
}

class ObjectType {
  constructor(key, properties) {
    this.name = 'ObjectType';
    this.key = key;
    this.typeName = null;
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

  getInterface(bodyOnly) {
    let body = '';
    const entries = Object.entries(this.properties);
    if (entries.length === 0) {
      return '';
    }
    for (const [key, types] of entries) {
      const optional = types.some(t => t.name === 'UndefinedType');
      let adjusted = types
        .filter(t => t.name !== 'UndefinedType')
        .map(t => t.toString())
        .sort(typeSorter)
        .join(' | ');
      if (adjusted === 'null') {
        adjusted = 'Json';
      }
      body += `  ${key.includes(' ') ? `'${key}'` : key}${optional ? '?' : ''}: ${adjusted},\n`;
    }
    body = body.slice(0, -2);
    if (bodyOnly) {
      return body;
    }
    if (!this.typeName) {
      this.typeName = getTypeName(this.key);
    }
    let interfaceString = `interface ${this.typeName} {\n`;
    return `${interfaceString}${body}\n}`;
  }

  setTypeName() {
    if (!this.typeName) {
      const body = this.getInterface(true);
      const match = interfaceBodies.get(body);
      if (match) {
        this.typeName = match;
      }
      else {
        this.typeName = getTypeName(this.key, body);
      }
    }
  }

  getInterfaces() {
    this.setTypeName();
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
    this.setTypeName();
    return this.typeName;
  }
}

const getTypeName = (key, body) => {
  key = camel(key);
  key = pluralize.singular(key);
  key = capitalize(key);
  if (!usedNames.has(key)) {
    usedNames.add(key);
    interfaceBodies.set(body, key);
    return key;
  }
  for (let i = 0; i < 100; i++) {
    const word = words[Math.floor(Math.random() * words.length)];
    const name = `${word}${key}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      interfaceBodies.set(name, body);
      return name;
    }
  }
  throw Error('Unable to generate an interface name.');
}

const createObjectType = (className, item) => {
  const properties = {};
  for (const [key, value] of Object.entries(item)) {
    const tree = {
      root: {},
      className: key
    };
    parse(value, tree);
    properties[key] = [tree.root];
  }
  return new ObjectType(className, properties);
}

const mergeTypes = (into, from) => {
  if (into.find(t => t.name === 'JsonType') || from.find(t => t.name === 'JsonType')) {
    const type = new JsonType();
    return [type];
  }
  const existingNames = into.map(t => t.name);
  const existingValues = into.filter(t => t.name === 'ValueType').map(t => t.type);
  const needsAdding = from.filter(t => !existingNames.includes(t.name));
  into.push(...needsAdding);
  const stringType = into.find(t => t.name === 'ValueType' && t.type === 'string');
  const enumType = into.find(t => t.name === 'EnumType');
  if (stringType && enumType) {
    into = into.filter(t => t.name !== 'EnumType');
  }
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
      return [new JsonType()];
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
    return [new JsonType()];
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
    const items = sample(value);
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
          branch.root = new ArrayType([arrayType]);
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
      const type = new JsonType();
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
    if (items.length === sampleSize) {
      const stringTypes = [];
      for (const [key, types] of Object.entries(sampleObject.properties)) {
        if (types.length === 1) {
          const type = types.at(0);
          if (type.name === 'ValueType' && type.type === 'string') {
            stringTypes.push(key);
          }
        }
      }
      for (const key of stringTypes) {
        const unique = new Set();
        let tooLong = false;
        for (const item of items) {
          const value = item[key];
          if (value.length > 15) {
            tooLong = true;
          }
          unique.add(value);
          if (unique.size > 8) {
            break;
          }
        }
        if (unique.size <= 8 && !tooLong) {
          const types = Array.from(unique.values());
          const type = new EnumType(key, types);
          sampleObject.properties[key] = [type];
        }
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
    dog: 'asfasf',
    direction: 'north'
  },
  {
    instagram: 'asfasf',
    direction: 'south'
  },
  {
    instagram: 'asfasf asfasf asf',
    direction: 'north'
  },
  {
    instagram: 'asfasf',
    direction: 'east'
  },
  {
    dog: 3,
    direction: 'east'
  },
  {
    instagram: 'asfasf',
    direction: 'west'
  }
]
const tree = {
  root: {},
  className: 'Social'
};
const t = JSON.parse(await readFile('test.json', 'utf-8'));
parse(t, tree);
console.log(tree.root.toString());
const interfaces = tree.root.getInterfaces();
const existing = new Set();
for (const interfaceString of interfaces) {
  if (!interfaceString) {
    continue;
  }
  const match = /((type)|(interface)) (?<name>[a-z]+) /mi.exec(interfaceString);
  const name = match.groups.name;
  if (existing.has(name)) {
    continue;
  }
  existing.add(name);
  console.log(interfaceString);
}