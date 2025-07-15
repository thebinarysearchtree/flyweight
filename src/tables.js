const types = ['Int', 'Real', 'Text', 'Blob', 'Json', 'Date', 'Boolean'];
const modifiers = [
  ['', {}, 'after'],
  ['PrimaryKey', { primaryKey: true }, 'after'],
  ['Optional', { notNull: false }, 'before'],
  ['Unique', { unique: true }, 'before']
];

class Table {
  static requests = new Map();

  constructor() {
    for (const type of types) {
      for (const modifier of modifiers) {
        const [word, props, position] = modifier;
        const key = position === 'before' ? `${word}${type}` : `${type}${word}`;
        Object.defineProperty(this, key, {
          get: function() {
            const symbol = Symbol();
            Table.requests.set(symbol, {
              category: 'DataType',
              type,
              notNull: true,
              ...props
            });
            return symbol;
          }
        });
      }
    }
    for (const type of ['Delete', 'Update']) {
      for (const action of ['NoAction', 'Restrict', 'SetNull', 'SetDefault', 'Cascade']) {
        const key = `On${type}${action}`;
        Object.defineProperty(Table, key, {
          get: function() {
            const symbol = Symbol();
            Table.requests.set(symbol, {
              category: 'ForeignKey',
              table: this.name,
              type: key
            });
            return symbol;
          }
        });
      }
    }
    for (const category of ['Index', 'Unique', 'Default', 'PrimaryKey']) {
      Object.defineProperty(this, category, {
        get: function() {
          const symbol = Symbol();
          Table.requests.set(symbol, {
            category
          });
          return symbol;
        }
      });
    }
    const defaults = [
      ['date', 'Now', 'now'],
      ['boolean', 'True', true],
      ['boolean', 'False', false]
    ];
    for (const item of defaults) {
      const [type, key, value] = item;
      Object.defineProperty(this, key, {
        get: function() {
          const symbol = Symbol();
          Table.requests.set(symbol, {
            category: 'DataType',
            type,
            notNull: true,
            default: value
          });
          return symbol;
        }
      });
    }
  }
}

class Locations extends Table {
  id = this.IntPrimaryKey;
  name = this.Text;
  address = this.Text;
  lat = this.Real;
  long = this.Real;
}

class Events extends Table {
  id = this.IntPrimaryKey;
  name = 'Cat';
  startTime = this.Now;
  locationId = this.OptionalInt;

  Attributes = {
    [this.locationId]: Locations.OnDeleteCascade,
    [this.startTime]: this.Now,
    [this.Index]: this.startTime,
    [this.Default]: [this.name, 'Cat']
  }
}

const process = (Custom) => {
  const instance = new Custom();
  const columns = [];
  const keys = Object
    .getOwnPropertyNames(instance)
    .filter(k => /[a-z]/.test(k.at(0)));
  for (const key of keys) {
    const value = instance[key];
    const valueType = typeof value;
    if (valueType === 'symbol') {
      const request = Table.requests.get(value);
      const { category, ...column } = request;
      columns.push({
        name: key,
        ...column
      });
    }
    else {
      columns.push({
        name: key,
        type: 'text',
        notNull: true,
        default: value
      });
    }
  }
  const attributes = instance.Attributes;
}

process(Events);
