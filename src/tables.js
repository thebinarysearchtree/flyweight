const types = ['Int', 'Real', 'Text', 'Blob', 'Json', 'Date', 'Boolean'];
const modifiers = [
  ['', {}, 'after'],
  ['PrimaryKey', { primaryKey: true }, 'after'],
  ['Optional', { notNull: false }, 'before'],
  ['Unique', { unique: true }, 'before']
];

const removeCapital = (name) => {
  return name.at(0).toLowerCase() + name.substring(1);
}

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

for (const type of ['Delete', 'Update']) {
  for (const action of ['NoAction', 'Restrict', 'SetNull', 'SetDefault', 'Cascade']) {
    const key = `On${type}${action}`;
    Object.defineProperty(Table, key, {
      get: function() {
        const symbol = Symbol();
        Table.requests.set(symbol, {
          category: 'ForeignKey',
          table: removeCapital(this.name),
          type: key
        });
        return symbol;
      }
    });
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

const process = (Custom, tables) => {
  const instance = new Custom();
  const table = {
    columns: [],
    indexes: [],
    primaryKeys: []
  };
  const columnSymbols = new Map();
  const literals = new Map();
  const keys = Object
    .getOwnPropertyNames(instance)
    .filter(k => /[a-z]/.test(k.at(0)));
  for (const key of keys) {
    const value = instance[key];
    const valueType = typeof value;
    if (valueType === 'symbol') {
      const request = Table.requests.get(value);
      const { category, primaryKey, ...column } = request;
      if (primaryKey) {
        table.primaryKeys.push(key);
      }
      const data = {
        name: key,
        ...column
      };
      table.columns.push(data);
      columnSymbols.set(value, data);
    }
    else {
      if (literals.has(value)) {
        throw Error('Cannot use the same default value more than once');
      }
      let type = valueType.toLowerCase();
      if (valueType === 'string') {
        type = 'text';
      }
      else if (valueType === 'number') {
        if (Number.isInteger(value)) {
          type = 'integer';
        }
        else {
          type = 'real';
        }
      }
      else if (value instanceof Date) {
        type = 'date';
      }
      else {
        throw Error('Unsupported default type');
      }
      const column = {
        name: key,
        type,
        notNull: true,
        default: value
      };
      literals.set(value, column);
      table.columns.push(column);
    }
  }
  const attributes = instance.Attributes || {};
  const symbols = Object.getOwnPropertySymbols(attributes);
  for (const symbol of symbols) {
    const value = attributes[symbol];
    const keyRequest = Table.requests.get(symbol);
    const valueRequest = Table.requests.get(value);
    const column = columnSymbols.get(symbol);
    const valueTable = tables.find(t => t === value);
    if (column) {
      if (valueRequest) {
        const category = valueRequest.category;
        if (category === 'ForeignKey') {
          column.references = valueRequest.table;
          column.action = valueRequest
            .type
            .replaceAll(/([a-z])([A-Z])/gm, '$1 $2')
            .toLowerCase();
        }
        else if (category === 'DataType') {
          column.default = valueRequest.default;
        }
      }
      else if (valueTable) {
        column.references = valueTable.name;
      }
    }
    else if (keyRequest) {
      const category = keyRequest.category;
      if (category === 'Default') {
        const [columnSymbol, defaultValue] = value;
        const column = columnSymbols.get(columnSymbol) || literals.get(columnSymbol);
        column.default = defaultValue;
      }
      else if (category === 'Unique') {
        const values = Array.isArray(value) ? value : [value];
        const columns = values.map(v => columnSymbols.get(v).name);
        table.indexes.push({
          type: 'unique',
          columns
        });
      }
      else if (category === 'Index') {
        const values = Array.isArray(value) ? value : [value];
        const columns = values.map(v => columnSymbols.get(v).name);
        table.indexes.push({ columns });
      }
      else if (category === 'PrimaryKey') {
        const values = Array.isArray(value) ? value : [value];
        const columns = values.map(v => columnSymbols.get(v).name);
        table.primaryKeys.push(...columns);
      }
    }
  }
  console.log(table);
}

process(Events, [Locations, Events]);
process(Locations, [Locations, Events]);
