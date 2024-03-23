var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.js
var flyweight_exports = {};
__export(flyweight_exports, {
  Database: () => db_default,
  gt: () => gt,
  gte: () => gte,
  lt: () => lt,
  lte: () => lte,
  not: () => not
});
module.exports = __toCommonJS(flyweight_exports);

// src/db.js
var import_sqlite3 = __toESM(require("sqlite3"), 1);

// src/utils.js
var import_promises = require("fs/promises");
var import_path = require("path");
var toValues = (rows) => {
  if (!rows || rows.length === 0) {
    return rows;
  }
  const sample = rows[0];
  const keys = Object.keys(sample);
  if (keys.length === 1) {
    const key = keys[0];
    return rows.map((r) => r[key]);
  }
  return rows;
};
var readSql = async (path) => {
  let sql = "";
  if (path.endsWith(".sql")) {
    sql = await (0, import_promises.readFile)(path, "utf8");
  } else {
    const names = await (0, import_promises.readdir)(path);
    for (const name of names) {
      if (name.endsWith(".sql")) {
        let text = await (0, import_promises.readFile)((0, import_path.join)(path, name), "utf8");
        text = text.trim();
        if (!text.endsWith(";")) {
          text += ";";
        }
        text += "\n\n";
        sql += text;
      }
    }
  }
  return sql.trim() + "\n";
};

// src/parsers.js
var parse = (rows, types) => {
  if (rows.length === 0) {
    return rows;
  }
  if (!types) {
    return rows;
  }
  const needsParsing = Object.values(types).some((t) => t !== null);
  if (!needsParsing) {
    return rows;
  }
  const results = [];
  for (const row of rows) {
    const adjusted = {};
    for (const [key, value] of Object.entries(row)) {
      const parser = types[key];
      if (parser) {
        adjusted[key] = parser(value);
      } else {
        adjusted[key] = value;
      }
    }
    results.push(adjusted);
  }
  return toValues(results);
};

// src/map.js
var import_pluralize = __toESM(require("pluralize"), 1);
var renameColumns = (o, columns) => {
  const result = {};
  for (const [key, value] of Object.entries(o)) {
    const column = columns[key];
    if (column) {
      result[column] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
};
var parse2 = (o, types) => {
  const result = {};
  for (const [key, value] of Object.entries(o)) {
    const parser = types[key];
    if (parser) {
      result[key] = parser(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};
var auto = (db, rows, columns, types, one) => {
  if (rows.length === 0) {
    return [];
  }
  if (one) {
    let result = rows[0];
    if (types) {
      result = parse2(result, types);
    }
    if (columns) {
      result = renameColumns(result, columns);
    }
    return result;
  } else {
    if (types) {
      rows = rows.map((s) => parse2(s, types));
    }
    if (columns) {
      rows = rows.map((s) => renameColumns(s, columns));
    }
    return rows;
  }
};
var mapOne = (db, rows, columns, types) => auto(db, rows, columns, types, true);
var mapMany = (db, rows, columns, types) => auto(db, rows, columns, types, false);

// src/parsers/utils.js
var isEscape = (s) => /(?<escape>\\+)$/.exec(s).groups.escape.length % 2 === 1;
var blank = (s, options) => {
  let processed = "";
  let count2 = 0;
  let previous;
  let inString = false;
  let i = 0;
  let stringStart = false;
  let bracketStart = false;
  let open = options?.open || "(";
  let close = options?.close || ")";
  let stringsOnly = options?.stringsOnly;
  for (const char of s.split("")) {
    if (char === "'") {
      if (previous === "\\") {
        if (!isEscape(s.substring(0, i))) {
          inString = !inString;
        }
      } else {
        inString = !inString;
      }
      if (inString) {
        stringStart = true;
      }
    }
    if (char === open && !inString) {
      count2++;
      if (count2 === 1) {
        bracketStart = true;
      }
    }
    if (char === close && !inString) {
      count2--;
    }
    if (stringsOnly) {
      if (!inString || stringStart) {
        processed += char;
        stringStart = false;
      } else {
        processed += " ";
      }
    } else {
      if (count2 > 0 || inString) {
        if (count2 === 0 && inString && stringStart) {
          processed += char;
          stringStart = false;
        } else {
          if (count2 !== 0 && bracketStart) {
            processed += char;
            bracketStart = false;
          } else {
            processed += " ";
          }
        }
      } else {
        processed += char;
      }
    }
    previous = char;
    i++;
  }
  return processed;
};

// src/parsers/returnTypes.js
var returnTypes = {
  abs: "integer",
  changes: "integer",
  char: "text",
  format: "text",
  hex: "text",
  instr: "integer",
  last_insert_rowid: "integer",
  length: "integer",
  like: "boolean",
  likelihood: "integer",
  lower: "text",
  ltrim: "text",
  printf: "text",
  quote: "text",
  random: "integer",
  randomblob: "blob",
  replace: "text",
  round: "integer",
  rtrim: "text",
  sign: "integer",
  substr: "text",
  substring: "text",
  total_changes: "integer",
  trim: "text",
  typeof: "text",
  unicode: "integer",
  upper: "text",
  date: "text",
  time: "text",
  datetime: "text",
  julianday: "integer",
  unixepoch: "integer",
  strftime: "text",
  avg: "real",
  count: "integer",
  group_concat: "text",
  max: "integer",
  min: "integer",
  sum: "integer",
  total: "integer",
  row_number: "integer",
  rank: "integer",
  dense_rank: "integer",
  percent_rank: "integer",
  cume_dist: "integer",
  ntile: "integer",
  acos: "integer",
  acosh: "integer",
  asin: "integer",
  asinh: "integer",
  atan: "integer",
  atan2: "integer",
  atanh: "integer",
  ceil: "integer",
  ceiling: "integer",
  cos: "integer",
  cosh: "integer",
  degrees: "integer",
  exp: "integer",
  floor: "integer",
  ln: "integer",
  log: "integer",
  log10: "integer",
  log2: "integer",
  mod: "integer",
  pi: "integer",
  pow: "integer",
  power: "integer",
  radians: "integer",
  sin: "integer",
  sinh: "integer",
  sqrt: "integer",
  tan: "integer",
  tanh: "integer",
  trunc: "integer",
  json_array: "json",
  json_array_length: "integer",
  json_object: "json",
  json_type: "text",
  json_valid: "integer",
  json_group_array: "json",
  json_group_object: "json",
  highlight: "text",
  snippet: "text"
};
var notNullFunctions = /* @__PURE__ */ new Set([
  "count",
  "changes",
  "char",
  "glob",
  "hex",
  "last_insert_rowid",
  "like",
  "likelihood",
  "likely",
  "lower",
  "printf",
  "quote",
  "random",
  "randomblob",
  "replace",
  "round",
  "rtrim",
  "sqlite_source_id",
  "sqlite_version",
  "substr",
  "substring",
  "total_changes",
  "trim",
  "typeof",
  "unicode",
  "unlikely",
  "upper",
  "zeroblob",
  "json_array",
  "json_object",
  "json_valid",
  "json_group_array",
  "json_group_object",
  "json_each",
  "json_tree",
  "highlight",
  "snippet"
]);

// src/parsers/queries.js
var isNumber = (s) => /^((-|\+)?(0x)?\d+)(\.\d+)?(e\d)?$/.test(s);
var getTempTables = (query, fromPattern, tables) => {
  const blanked = blank(query);
  const [start, end] = fromPattern.exec(blanked).indices.groups.from;
  const from = query.substring(start, end);
  const processed = blank(from);
  const matches = processed.matchAll(/(?<subQuery>\([^)]+\))/gm);
  const tempTables = {};
  let processedQuery = query;
  let i = 1;
  for (const match of matches) {
    const subQuery = match.groups.subQuery;
    const processed2 = from.substring(match.index + 1, match.index + subQuery.length - 1);
    const parsedTable = parseSelect(processed2, tables);
    if (!parsedTable) {
      continue;
    }
    const tableName = `flyweight_temp${i}`;
    processedQuery = processedQuery.replace(from.substring(match.index, match.index + subQuery.length), tableName);
    const columns = parsedTable.map((c) => ({
      name: c.name,
      type: c.type,
      notNull: c.notNull,
      isOptional: c.isOptional,
      structuredType: c.structuredType,
      functionName: c.functionName,
      functionContent: c.functionContent,
      types: c.types,
      jsonExtractor: c.jsonExtractor
    }));
    tempTables[tableName] = columns;
    i++;
  }
  return {
    processedQuery,
    tempTables
  };
};
var getQueryType = (query) => {
  if (/^\s*create view /gmi.test(query)) {
    return "select";
  }
  if (/^\s*select /gmi.test(query)) {
    return "select";
  }
  if (/^\s*insert into /gmi.test(query)) {
    return "insert";
  }
  if (/^\s*update /gmi.test(query)) {
    return "update";
  }
  if (/^\s*delete from /gmi.test(query)) {
    return "delete";
  }
  if (/^\s*with /gmi.test(query)) {
    return "cte";
  }
  if (/^\s*create view [^\s]+ as with /gmi.test(query)) {
    return "cte";
  }
  if (/^\s*pragma /gmi.test(query)) {
    return "pragma";
  }
  return null;
};
var isWrite = (sql) => {
  sql = sql.replaceAll(/\s+/gm, " ");
  sql = blank(sql, { stringsOnly: true });
  return /(^| |\()(insert|update|delete) /gi.test(sql);
};
var parseQuery = (sql, tables) => {
  tables = { ...tables };
  sql = sql.replaceAll(/\s+/gm, " ");
  const queryType = getQueryType(sql);
  if (queryType === "select" || queryType === "cte") {
    return parseSelect(sql, tables);
  }
  return parseWrite(sql, tables);
};
var parsers = [
  {
    name: "Literal pattern",
    pattern: /^((?<isString>'.+')|(?<isNumber>((-|\+)?(0x)?\d+)(\.\d+)?(e\d)?)|(?<isBoolean>(true)|(false)))\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
    extractor: (groups) => {
      const { isString, isNumber: isNumber2, isBoolean, columnAlias } = groups;
      let type;
      if (isString !== void 0) {
        type = "text";
      } else if (isNumber2 !== void 0) {
        if (isNumber2.includes(".")) {
          type = "real";
        } else {
          type = "integer";
        }
      } else if (isBoolean !== void 0) {
        type = "boolean";
      }
      return {
        columnAlias,
        type,
        notNull: true
      };
    }
  },
  {
    name: "Column pattern",
    pattern: /^((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>([a-z0-9_]+)|\*)(\s(as)\s(?<columnAlias>[a-z0-9_]+))?$/mi,
    extractor: (groups) => {
      const { tableAlias, columnName, columnAlias } = groups;
      return {
        tableAlias,
        columnName,
        columnAlias,
        rename: true
      };
    }
  },
  {
    name: "Cast pattern",
    pattern: /^cast\(.+? as (?<type>[a-z0-9_]+)\) as (?<columnAlias>[a-z0-9_]+)$/mi,
    pre: (statement) => blank(statement, { stringsOnly: true }),
    extractor: (groups) => {
      const { type, columnAlias } = groups;
      let dbType;
      if (type === "none") {
        dbType = "blob";
      } else if (type === "numeric") {
        dbType = "integer";
      } else {
        dbType = type;
      }
      return {
        columnAlias,
        type: dbType
      };
    }
  },
  {
    name: "Function pattern",
    pattern: /^(?<functionName>[a-z0-9_]+)\((?<functionContent>((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>([a-z0-9_]+)|\*)|(.+?))\)( as (?<columnAlias>[a-z0-9_]+))?$/mid,
    pre: (statement) => blank(statement, { stringsOnly: true }),
    extractor: (groups, tables, indices, statement) => {
      const { functionName, tableAlias, columnName, columnAlias } = groups;
      const type = returnTypes[functionName] || null;
      if (columnName !== void 0 && isNumber(columnName)) {
        return {
          tableAlias,
          type,
          functionName
        };
      }
      const [start, end] = indices.groups.functionContent;
      const functionContent = statement.substring(start, end);
      return {
        tableAlias,
        columnName,
        columnAlias,
        type,
        functionName,
        functionContent
      };
    }
  },
  {
    name: "Select pattern",
    pattern: /^\s*\(\s*(?<select>select\s.+)\)\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
    pre: (statement) => blank(statement, { stringsOnly: true }),
    extractor: (groups, tables) => {
      const { select, columnAlias } = groups;
      const columns = parseQuery(select, tables);
      const column = columns[0];
      column.name = columnAlias;
      column.rename = false;
      column.primaryKey = false;
      column.foreign = false;
      return { column };
    }
  },
  {
    name: "Operator pattern",
    pattern: /^(?!(case )).+\s((?<logical>=|(!=)|(==)|(<>)|(>=)|(<=)|>|<)|(?<maths>\*|\/|%|\+|-))\s.+\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
    extractor: (groups) => {
      const { columnAlias, logical } = groups;
      let type;
      if (logical !== void 0) {
        type = "boolean";
      } else {
        type = "integer";
      }
      return {
        columnAlias,
        type
      };
    }
  },
  {
    name: "Case pattern",
    pattern: /^case (?<caseBody>.+) end as (?<columnAlias>[a-z0-9_]+)$/mid,
    extractor: (groups, tables, indices, statement) => {
      const { columnAlias } = groups;
      const [start, end] = indices.groups.caseBody;
      const caseBody = statement.substring(start, end);
      return {
        columnAlias,
        caseBody
      };
    }
  },
  {
    name: "Expression pattern",
    pattern: /^.+ (not )?((in \([^)]+\))|(like)|(regexp)|(exists \([^)]+\))|(is null)|(is not null)|(is true)|(is false)) as (?<columnAlias>[a-z0-9_]+)$/mi,
    extractor: (groups) => {
      const { columnAlias } = groups;
      return {
        columnAlias,
        type: "boolean"
      };
    }
  },
  {
    name: "Json extractor pattern",
    pattern: /^(?<column>.+?)\s+(?<operator>->>|->)\s+'(?<extractor>.+?)'\s+as\s+(?<columnAlias>[a-z0-9_]+)$/mid,
    extractor: (groups, tables, indices, statement) => {
      const { column, operator, columnAlias } = groups;
      const [start, end] = indices.groups.extractor;
      const extractor = statement.substring(start, end);
      const type = operator === "->" ? "json" : "any";
      const match = /^((?<tableAlias>[a-z0-9_]+)\.)?(?<columnName>[a-z0-9_]+)$/gmi.exec(column);
      let jsonExtractor;
      if (match) {
        const { tableAlias, columnName } = match.groups;
        jsonExtractor = {
          tableAlias,
          columnName,
          operator,
          extractor
        };
      }
      return {
        columnAlias,
        type,
        jsonExtractor
      };
    }
  },
  {
    name: "Alias pattern",
    pattern: /.+\s(as)\s(?<columnAlias>[a-z0-9_]+)$/mi,
    extractor: (groups) => {
      const { columnAlias } = groups;
      return {
        columnAlias
      };
    }
  }
];
var parseColumn = (statement, tables) => {
  for (const parser of parsers) {
    const { pattern, extractor, pre } = parser;
    let processed;
    if (pre) {
      processed = pre(statement);
    } else {
      processed = blank(statement);
    }
    const result = pattern.exec(processed);
    if (result) {
      return extractor(result.groups, tables, result.indices, statement);
    }
  }
  return null;
};
var getSelectColumns = (select, tables) => {
  const matches = blank(select).matchAll(/(?<statement>[^,]+)(,|$)/gmd);
  const statements = [];
  for (const match of matches) {
    const [start, end] = match.indices.groups.statement;
    const statement = select.substring(start, end).trim();
    statements.push(statement);
  }
  const selectColumns = [];
  for (const statement of statements) {
    const parsed = parseColumn(statement, tables);
    selectColumns.push(parsed);
  }
  return selectColumns;
};
var getWhereColumns = (query) => {
  const blanked = blank(query);
  const match = blanked.match(/ where (?<where>.+?)(( group )|( window )|( order )|( limit )|$)/mi);
  if (!match) {
    return [];
  }
  const where = match.groups.where;
  if (/ or /gmi.test(where)) {
    return [];
  }
  const matches = where.matchAll(/(?<column>[a-z0-9_.]+) is not null/gmi);
  return Array.from(matches).map((match2) => {
    const column = match2.groups.column;
    const split = column.split(".");
    if (split.length === 1) {
      return { columnName: column };
    }
    return {
      tableAlias: split[0],
      columnName: split[1]
    };
  });
};
var parseWrite = (query, tables) => {
  const blanked = blank(query);
  const tableMatch = /^\s*(insert into |update |delete from )(?<tableName>[a-z0-9_]+)/gmi.exec(blanked);
  const returningMatch = / returning (?<columns>.+)$/gmi.exec(blanked);
  if (!returningMatch) {
    return [];
  }
  const selectColumns = getSelectColumns(returningMatch.groups.columns, tables);
  const tableName = tableMatch.groups.tableName;
  const columns = tables[tableName];
  if (selectColumns.length === 1 && selectColumns[0].columnName === "*") {
    return columns.map((c) => ({
      name: c.name,
      type: c.type,
      originalName: c.name,
      tableName,
      primaryKey: c.primaryKey,
      foreign: c.foreign,
      notNull: c.notNull || c.primaryKey
    }));
  }
  return selectColumns.map((column) => {
    const tableColumn = columns.find((c) => c.name === column.columnName);
    return {
      name: column.columnAlias || column.columnName,
      type: column.type || tableColumn.type,
      originalName: column.columnName,
      tableName,
      primaryKey: tableColumn.primaryKey,
      foreign: column.foreign,
      notNull: tableColumn.notNull || tableColumn.primaryKey
    };
  });
};
var getStructuredType = (content, tables, fromTables, whereColumns, joinColumns) => {
  const matches = blank(content).matchAll(/(?<item>[^,]+)(,|$)/gmid);
  let i = 0;
  const structured = {};
  let key;
  for (const match of matches) {
    const [start, end] = match.indices.groups.item;
    const item = content.substring(start, end).trim();
    if (i % 2 === 0) {
      key = item.replaceAll("'", "");
    } else {
      const column = parseColumn(item + ` as ${key}`);
      const processed = processColumn(column, tables, fromTables, whereColumns, joinColumns);
      if (processed.structuredType) {
        processed.type = processed.structuredType.type;
      }
      structured[key] = processed;
    }
    i++;
  }
  return { type: structured };
};
var getScalarColumns = (content, tables, fromTables, whereColumns, joinColumns) => {
  const matches = blank(content).matchAll(/(?<item>[^,]+)(,|$)/gmid);
  const columns = [];
  let i = 0;
  for (const match of matches) {
    const [start, end] = match.indices.groups.item;
    const item = content.substring(start, end).trim();
    const column = parseColumn(item + ` as c${i}`);
    const processed = processColumn(column, tables, fromTables, whereColumns, joinColumns);
    if (processed.structuredType) {
      processed.type = processed.structuredType.type;
    }
    columns.push(processed);
    i++;
  }
  return columns;
};
var processColumn = (column, tables, fromTables, whereColumns, joinColumns) => {
  if (column.column) {
    return column.column;
  }
  let type = null;
  let tableName;
  let primaryKey;
  let foreign;
  let notNull = column.notNull || false;
  let isOptional = false;
  let structuredType = null;
  let starColumns = null;
  let types;
  let functionName = column.functionName;
  if (functionName) {
    if (notNullFunctions.has(functionName)) {
      notNull = true;
    }
  }
  if (column.jsonExtractor) {
    const fromTable = fromTables.find((t) => t.tableAlias === column.jsonExtractor.tableAlias);
    const tableColumn = tables[fromTable.tableName].find((c) => c.name === column.jsonExtractor.columnName);
    if (tableColumn) {
      column.jsonExtractor.type = tableColumn.type;
      const joinColumn = joinColumns.find((c) => c.tableAlias === column.jsonExtractor.tableAlias && c.columnName === column.jsonExtractor.columnName);
      const whereColumn = whereColumns.find((c) => c.tableAlias === column.jsonExtractor.tableAlias && c.columnName === column.jsonExtractor.columnName);
      primaryKey = tableColumn.primaryKey;
      foreign = tableColumn.foreign;
      type = tableColumn.type;
      notNull = tableColumn.notNull === true || tableColumn.primaryKey || joinColumn !== void 0 || whereColumn !== void 0;
      isOptional = fromTable.isOptional;
    } else {
      const { jsonExtractor, ...rest } = column;
      column = rest;
    }
  }
  if (column.caseBody) {
    const split = blank(column.caseBody).split(/((?: when )|(?: then )|(?: else )|(?: end(?:$| )))/i);
    types = [];
    let last;
    let i = 0;
    let start = 0;
    for (const blanked of split) {
      const statement = column.caseBody.substring(start, start + blanked.length).trim();
      if (last && /then|else/i.test(last)) {
        const column2 = parseColumn(`${statement} as c${i}`);
        const processed = processColumn(column2, tables, fromTables, whereColumns, joinColumns);
        if (processed.structuredType) {
          processed.type = processed.structuredType.type;
        }
        types.push(processed);
      }
      last = statement;
      i++;
      start += blanked.length;
    }
  }
  if (functionName === "coalesce") {
    const content = column.functionContent;
    const matches = blank(content).matchAll(/(?<item>[^,]+)(,|$)/gmid);
    types = [];
    let i = 0;
    for (const match of matches) {
      const [start, end] = match.indices.groups.item;
      const item = content.substring(start, end).trim();
      const column2 = parseColumn(item + ` as c${i}`);
      const processed = processColumn(column2, tables, fromTables, whereColumns, joinColumns);
      if (processed.structuredType) {
        processed.type = processed.structuredType.type;
      }
      types.push(processed);
      i++;
    }
    let wontReturnNull = false;
    for (const type2 of types) {
      if ((type2.notNull || type2.primaryKey) && !type2.isOptional) {
        wontReturnNull = true;
        break;
      }
    }
    if (wontReturnNull) {
      for (const type2 of types) {
        type2.notNull = true;
        type2.isOptional = false;
      }
    }
  }
  if (column.type) {
    if ((functionName === "min" || functionName === "max") && column.columnName) {
      const fromTable = fromTables.find((t) => t.tableAlias === column.tableAlias);
      tableName = fromTable.tableName;
      const tableColumn = tables[fromTable.tableName].find((c) => c.name === column.columnName);
      notNull = tableColumn.notNull;
      if (tableColumn.type === "date") {
        type = "date";
      } else if (tableColumn.type === "boolean") {
        type = "boolean";
      } else if (tableColumn.type === "text") {
        type = "text";
      } else {
        type = column.type;
      }
    } else {
      type = column.type;
      if (functionName === "json_group_array") {
        if (column.columnName) {
          const fromTable = fromTables.find((t) => t.tableAlias === column.tableAlias);
          tableName = fromTable.tableName;
          const tableColumn = tables[fromTable.tableName].find((c) => c.name === column.columnName);
          const joinColumn = joinColumns.find((c) => c.tableAlias === column.tableAlias && c.columnName === column.columnName);
          const whereColumn = whereColumns.find((c) => c.tableAlias === column.tableAlias && c.columnName === column.columnName);
          const notNull2 = tableColumn.notNull === true || tableColumn.primaryKey || joinColumn !== void 0 || whereColumn !== void 0;
          const isOptional2 = fromTable.isOptional;
          structuredType = {
            type: tableColumn.type,
            notNull: notNull2,
            isOptional: isOptional2
          };
        } else {
          const objectMatch = /^\s*json_object\((?<functionContent>[^)]+)\)\s*$/gmid.exec(blank(column.functionContent));
          if (objectMatch) {
            const [start, end] = objectMatch.indices.groups.functionContent;
            const content = column.functionContent.substring(start, end);
            const structured = getStructuredType(content, tables, fromTables, whereColumns, joinColumns);
            structuredType = structured;
            const match = /^((?<tableAlias>[a-z0-9_]+)\.)?\*$/i.exec(content);
            if (match) {
              const tableAlias = match.groups.tableAlias;
              const fromTable = fromTables.find((t) => t.tableAlias === tableAlias);
              const columns = tables[fromTable.tableName];
              starColumns = columns.map((c) => tableAlias ? `${tableAlias}.${c.name}` : c.name);
            }
          }
          const arrayMatch = /^\s*json_array\((?<functionContent>[^)]+)\)\s*$/gmid.exec(blank(column.functionContent));
          if (arrayMatch) {
            const [start, end] = arrayMatch.indices.groups.functionContent;
            const content = column.functionContent.substring(start, end);
            structuredType = {
              type: getScalarColumns(content, tables, fromTables, whereColumns, joinColumns)
            };
          }
        }
      } else if (functionName === "json_object") {
        structuredType = getStructuredType(column.functionContent, tables, fromTables, whereColumns, joinColumns);
        const match = /^((?<tableAlias>[a-z0-9_]+)\.)?\*$/i.exec(column.functionContent);
        if (match) {
          const tableAlias = match.groups.tableAlias;
          const fromTable = fromTables.find((t) => t.tableAlias === tableAlias);
          const columns = tables[fromTable.tableName];
          starColumns = columns.map((c) => tableAlias ? `${tableAlias}.${c.name}` : c.name);
        }
      } else if (functionName === "json_array") {
        const content = column.functionContent;
        structuredType = getScalarColumns(content, tables, fromTables, whereColumns, joinColumns);
      }
    }
  } else if (column.columnName) {
    const fromTable = fromTables.find((t) => t.tableAlias === column.tableAlias);
    tableName = fromTable.tableName;
    const tableAlias = column.tableAlias;
    if (column.columnName === "*") {
      const results = [];
      for (const column2 of tables[fromTable.tableName]) {
        let type2 = column2.type;
        const joinColumn = joinColumns.find((c) => c.tableAlias === tableAlias && c.columnName === column2.name);
        const whereColumn = whereColumns.find((c) => c.tableAlias === tableAlias && c.columnName === column2.name);
        const notNull2 = column2.notNull === true || column2.primaryKey || joinColumn !== void 0 || whereColumn !== void 0;
        results.push({
          name: column2.name,
          type: type2,
          originalName: column2.name,
          tableName,
          primaryKey: column2.primaryKey,
          foreign: column2.foreign,
          notNull: notNull2,
          isOptional: fromTable.isOptional,
          structuredType: column2.structuredType,
          functionName: column2.functionName,
          functionContent: column2.functionContent,
          types: column2.types,
          partOf: tableAlias ? `${tableAlias}.*` : "*"
        });
      }
      return results;
    } else {
      const tableColumn = tables[fromTable.tableName].find((c) => c.name === column.columnName);
      const joinColumn = joinColumns.find((c) => c.tableAlias === column.tableAlias && c.columnName === column.columnName);
      const whereColumn = whereColumns.find((c) => c.tableAlias === column.tableAlias && c.columnName === column.columnName);
      primaryKey = tableColumn.primaryKey;
      foreign = tableColumn.foreign;
      type = tableColumn.type;
      notNull = tableColumn.notNull === true || tableColumn.primaryKey || joinColumn !== void 0 || whereColumn !== void 0;
      isOptional = fromTable.isOptional;
      structuredType = tableColumn.structuredType;
      functionName = tableColumn.functionName;
      types = tableColumn.types;
    }
  }
  return {
    name: column.columnAlias || column.columnName,
    type,
    originalName: column.columnName,
    tableName,
    primaryKey,
    foreign,
    notNull,
    isOptional,
    rename: column.rename,
    structuredType,
    functionName,
    types,
    jsonExtractor: column.jsonExtractor,
    starColumns
  };
};
var parseSelect = (query, tables) => {
  let processed = blank(query);
  const isCte = /^\s*(create\s+view\s+[^\s]+\s+as\s+)?with\s/mi.test(processed);
  if (isCte) {
    let lastIndex;
    const matches2 = processed.matchAll(/(\s|,)(?<tableName>[a-z0-9_]+)(?<asType>\s(as|as materialized|as not materialized)\s\()(?<query>[^)]+)\)/gmi);
    for (const match of matches2) {
      const tableName = match.groups.tableName;
      const processed2 = match.groups.query;
      const offset = tableName.length + match.groups.asType.length + 1;
      const start2 = match.index + offset;
      const end2 = start2 + processed2.length;
      lastIndex = end2 + 1;
      const actual = query.substring(start2, end2);
      const columns = parseQuery(actual, tables);
      tables[tableName] = columns.map((c) => ({
        name: c.name,
        type: c.type,
        notNull: c.notNull,
        isOptional: c.isOptional,
        structuredType: c.structuredType,
        functionName: c.functionName,
        functionContent: c.functionContent,
        types: c.types
      }));
    }
    query = query.substring(lastIndex);
    processed = processed.substring(lastIndex);
  }
  const unionMatch = /\s+union\s+.+$/gmi.exec(query);
  if (unionMatch) {
    query = query.substring(0, unionMatch.index);
    processed = processed.substring(0, unionMatch.index);
  }
  if (!/^\s*(create\s+view\s+[^\s]+\s+as\s+)?select\s/mi.test(processed)) {
    return;
  }
  if (!/^\s*(create\s+view\s+[^\s]+\s+as\s+)?select\s(distinct\s)?(?<select>.+?)\sfrom\s.+$/md.test(processed)) {
    const [start2, end2] = /^\s*select\s(distinct\s)?(?<select>.+?)$/mdi.exec(processed).indices.groups.select;
    const select2 = query.substring(start2, end2);
    const selectColumns2 = getSelectColumns(select2, tables);
    const results2 = [];
    for (const column of selectColumns2) {
      const processed2 = processColumn(column, tables, [], [], []);
      results2.push(processed2);
    }
    return results2.flat();
  }
  const [start, end] = /^\s*(create\s+view\s+[^\s]+\s+as\s+)?select\s(distinct\s)?(?<select>.+?)\sfrom\s.+$/mdi.exec(processed).indices.groups.select;
  const select = query.substring(start, end);
  const selectColumns = getSelectColumns(select, tables);
  const fromTables = [];
  const fromPattern = /\sfrom\s+(?<from>(.|\s)+?)((\swhere\s)|(\sgroup\s)|(\swindow\s)|(\sorder\s)|(\slimit\s)|(\s*$))/mid;
  const { processedQuery, tempTables } = getTempTables(query, fromPattern, tables);
  tables = { ...tables, ...tempTables };
  const blanked = blank(processedQuery);
  const [fromStart, fromEnd] = fromPattern.exec(blanked).indices.groups.from;
  const fromClause = processedQuery.substring(fromStart, fromEnd);
  const from = fromClause.replaceAll(/(\snatural\s)|(\sfull\s)|(\sinner\s)|(\scross\s)|(\souter\s)/gm, " ").replaceAll(",", "join").replaceAll(/\son\s.+?(\s((left\s)|(right\s))?join\s)/gm, "$1").replaceAll(/\son\s+[^\s]+\s=\s+[^\s]+/gm, " ").split(/((?:(?:left\s)|(?:right\s))?join)\s/gm).map((s) => s.trim());
  const matches = fromClause.replaceAll(/(\snatural\s)|(\sfull\s)|(\sinner\s)|(\scross\s)|(\souter\s)/gm, " ").matchAll(/(?<! left) join .+ on (.+) = (.+)($|( join )|( left join ))/gmi);
  const joinColumns = Array.from(matches).flatMap((m) => [m[1], m[2]]).map((c) => {
    const parts = c.split(".");
    if (parts.length === 1) {
      return {
        columnName: parts[0]
      };
    }
    return {
      tableAlias: parts[0],
      columnName: parts[1]
    };
  });
  const whereColumns = getWhereColumns(query);
  let previousTable;
  let direction;
  for (const item of from) {
    if (direction === "right") {
      previousTable.isOptional = true;
    }
    const match = /((?<direction>.+?)\s)?join/gmi.exec(item);
    if (match) {
      direction = match.groups.direction;
      continue;
    }
    const split = item.split(/\s/);
    const tableName = split[0];
    const tableAlias = split[1];
    const table = {
      tableName,
      tableAlias,
      isOptional: direction === "left"
    };
    previousTable = table;
    fromTables.push(table);
  }
  const results = [];
  for (const column of selectColumns) {
    const processed2 = processColumn(column, tables, fromTables, whereColumns, joinColumns);
    results.push(processed2);
  }
  return results.flat();
};

// src/parsers/tables.js
var getVirtual = (sql) => {
  const pattern = /^\s*create virtual table\s+(?<tableName>[a-z0-9_]+)\s+using\s+fts5\s*\((?<columns>[^;]+)\)\s*;/gmid;
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(pattern);
  const tables = [];
  for (const tableMatch of tableMatches) {
    const tableName = tableMatch.groups.tableName;
    const [start, end] = tableMatch.indices.groups.columns;
    const columnsText = sql.substring(start, end);
    const columnMatches = blank(columnsText, { stringsOnly: true }).matchAll(/(?<column>[^,]+)(,|$)/gmid);
    const columnNames = [];
    for (const columnMatch of columnMatches) {
      const [start2, end2] = columnMatch.indices.groups.column;
      const column = columnsText.substring(start2, end2);
      const match = /^[^\s]+/gm.exec(column.trim());
      if (!column.includes("=") && match) {
        columnNames.push(match[0]);
      }
    }
    const columns = [];
    columns.push({
      name: "rowid",
      type: "integer",
      primaryKey: true,
      notNull: false,
      hasDefault: false
    });
    const mapped = columnNames.map((name) => {
      return {
        name,
        type: "text",
        primaryKey: false,
        notNull: true,
        hasDefault: false
      };
    });
    for (const column of mapped) {
      columns.push(column);
    }
    tables.push({
      name: tableName,
      columns,
      columnSet: new Set(columns.map((c) => c.name))
    });
  }
  return tables;
};
var getViews = (sql, db) => {
  const pattern = /^\s*create\s+view\s+(?<viewName>[a-z0-9_]+)\s+(\([^)]+\)\s+)?as\s+(?<select>[^;]+);/gmid;
  const matches = blank(sql, { stringsOnly: true }).matchAll(pattern);
  const views = [];
  for (const match of matches) {
    const name = match.groups.viewName;
    const [start, end] = match.indices.groups.select;
    const selectSql = sql.substring(start, end);
    const parsed = parseQuery(selectSql, db.tables);
    if (!parsed) {
      continue;
    }
    const columns = parsed.map((column) => {
      const { name: name2, type, primaryKey, foreign, notNull, isOptional } = column;
      return {
        name: name2,
        type,
        primaryKey,
        notNull: notNull && !isOptional,
        hasDefault: false,
        foreign
      };
    });
    views.push({
      name,
      columns,
      columnSet: new Set(columns.map((c) => c.name))
    });
  }
  return views;
};
var getColumn = (sql) => {
  const split = sql.split(/\s+/);
  const isColumn = split.length > 0 && !["unique", "check", "primary", "foreign"].includes(split[0].toLowerCase());
  if (!isColumn) {
    return;
  }
  let type;
  if (split.length === 1 || ["not", "primary", "foreign", "check"].includes(split[1].toLowerCase())) {
    type = split[0].toLowerCase();
  } else {
    type = split[1];
  }
  return {
    name: split[0],
    type
  };
};
var getFragments = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)\)(\s+without\s+rowid\s*)?\s*;/gmid);
  for (const tableMatch of tableMatches) {
    const [tableStart] = tableMatch.indices.groups.columns;
    const columnMatches = blank(tableMatch.groups.columns).matchAll(/(?<column>[^,]+)(,|$)/gmd);
    for (const columnMatch of columnMatches) {
      const [columnStart, columnEnd] = columnMatch.indices.groups.column;
      const result = getColumn(columnMatch.groups.column.trim());
      const start = tableStart + columnStart;
      const end = start + (columnEnd - columnStart);
      if (lastEnd !== start) {
        fragments.push({
          isColumn: false,
          sql: sql.substring(lastEnd, start)
        });
      }
      lastEnd = end;
      const fragment = sql.substring(start, end).replace(/\n$/, "");
      fragments.push({
        columnName: result ? result.name : null,
        type: result ? result.type : null,
        isColumn: result !== void 0,
        start,
        end,
        sql: fragment,
        blanked: columnMatch.groups.column
      });
    }
  }
  fragments.push({
    isColumn: false,
    sql: sql.substring(lastEnd)
  });
  return fragments;
};
var getTables = (sql) => {
  const tables = [];
  const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)\)(\s+without\s+rowid\s*)?\s*;/gmi);
  for (const match of matches) {
    const table = {
      name: match.groups.tableName,
      columns: [],
      columnSet: null
    };
    const columns = blank(match.groups.columns).replaceAll(/\s+/gm, " ").split(",").map((s) => s.trim());
    let primaryKeys;
    for (let column of columns) {
      const result = getColumn(column);
      if (!result) {
        continue;
      }
      const primaryKey = / primary key/mi.test(column);
      const notNull = / not null/mi.test(column);
      const hasDefault = / default /mi.test(column);
      const foreignMatch = / references (?<foreign>[a-z0-9_]+)(\s|$)/mi.exec(column);
      const foreign = foreignMatch ? foreignMatch.groups.foreign : void 0;
      if (/^(unique|check|primary|foreign)/mi.test(column)) {
        const match2 = /^primary key\((?<keys>[^)]+)\)/mi.exec(column);
        if (match2) {
          primaryKeys = match2.groups.keys.split(",").map((k) => k.trim());
        }
        continue;
      }
      table.columns.push({
        name: result.name,
        type: result.type,
        primaryKey,
        notNull,
        hasDefault,
        foreign
      });
    }
    if (primaryKeys) {
      for (const column of table.columns) {
        if (primaryKeys.includes(column.name)) {
          column.primaryKey = true;
        }
      }
    }
    if (!table.columns.some((c) => c.primaryKey)) {
      table.columns.push({
        name: "rowid",
        type: "integer",
        primaryKey: true,
        notNull: false,
        hasDefault: false
      });
    }
    table.columnSet = new Set(table.columns.map((c) => c.name));
    tables.push(table);
  }
  return tables;
};

// src/db.js
var import_promises4 = require("fs/promises");

// src/proxy.js
var import_fs = require("fs");

// src/modifiers.js
var Modifier = class {
  constructor(name, value, operator) {
    this.name = name;
    this.value = value;
    this.operator = operator;
  }
};
var not = (value) => value === void 0 ? value : new Modifier("not", value, "!=");
var gt = (value) => value === void 0 ? value : new Modifier("gt", value, ">");
var gte = (value) => value === void 0 ? value : new Modifier("gte", value, ">=");
var lt = (value) => value === void 0 ? value : new Modifier("lt", value, "<");
var lte = (value) => value === void 0 ? value : new Modifier("lte", value, "<=");

// src/queries.js
var isSpecial = (char) => [".", "+", "*", "^", "$", "(", ")", "{", "}", "[", "]", "|"].includes(char);
var convert = (regexp) => {
  const chars = regexp.source.split("");
  let escape = false;
  let processed = [];
  for (let i = 0; i < chars.length; i++) {
    const isLastChar = i === chars.length - 1;
    const nextChar = isLastChar ? null : chars[i + 1];
    const char = chars[i];
    if (i === 0 && char !== "^") {
      processed.push("%");
    }
    if (i === 0 && char === "^") {
      continue;
    }
    if (isLastChar && char === "$") {
      continue;
    }
    if (char === "\\") {
      escape = !escape;
      if (!isLastChar && nextChar !== "'" && nextChar !== "\\" && escape) {
        if (isSpecial(nextChar)) {
          escape = false;
          continue;
        }
        throw Error("Cannot convert RegExp to LIKE statement.");
      }
    }
    if (char === "." && !escape) {
      if (nextChar === "*") {
        processed.push("%");
        i++;
      }
      if (nextChar === "+") {
        processed.push("_%");
        i++;
      }
      if (!isSpecial(nextChar)) {
        processed.push("_");
      }
      continue;
    }
    if (char === "_" || char === "%") {
      processed.push("\\");
    }
    processed.push(char);
    if (isLastChar && char !== "$") {
      processed.push("%");
    }
    if (char !== "\\") {
      escape = false;
    }
  }
  return processed.join("");
};
var insert = async (db, table, params, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const columns = Object.keys(params);
  verify(columns);
  const placeholders = columns.map((c) => `$${c}`);
  const sql = `insert into ${table}(${columns.join(", ")}) values(${placeholders.join(", ")})`;
  const primaryKey = db.getPrimaryKey(table);
  const result = await db.all(`${sql} returning ${primaryKey}`, params, null, tx, true);
  return result[0][primaryKey];
};
var insertMany = async (db, table, items, tx) => {
  if (items.length === 0) {
    return;
  }
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const sample = items[0];
  const columns = Object.keys(sample);
  verify(columns);
  const hasBlob = db.tables[table].filter((c) => columns.includes(c.name)).some((c) => c.type === "blob");
  if (hasBlob) {
    let createdTransaction;
    if (!tx) {
      tx = await db.getTransaction();
      createdTransaction = true;
    }
    let statement;
    try {
      await tx.begin();
      const placeholders = columns.map((c) => `$${c}`);
      const sql2 = `insert into ${table}(${columns.join(", ")}) values(${placeholders.join(", ")})`;
      statement = await db.prepare(sql2, tx.db);
      const promises = [];
      for (const item of items) {
        const promise = db.run(statement, item, null, tx);
        promises.push(promise);
      }
      await Promise.all(promises);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      if (createdTransaction) {
        db.release(tx);
      }
      await db.finalize(statement);
      return;
    }
  }
  let sql = `insert into ${table}(${columns.join(", ")}) select `;
  const select = columns.map((c) => `json_each.value ->> '${c}'`).join(", ");
  sql += select;
  sql += " from json_each($items)";
  const params = {
    items: JSON.stringify(items)
  };
  await db.run(sql, params, null, tx);
};
var toClause = (query, verify) => {
  if (!query) {
    return null;
  }
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return null;
  }
  return entries.map(([column, param]) => {
    verify(column);
    if (param instanceof Modifier) {
      const value = param.value;
      if (Array.isArray(value)) {
        return `${column} not in (select json_each.value from json_each($${column}))`;
      }
      if (value instanceof RegExp) {
        return `${column} not like $${column}`;
      }
      if (value === null) {
        return `${column} is not null`;
      }
      return `${column} ${param.operator} $${column}`;
    }
    if (Array.isArray(param)) {
      return `${column} in (select json_each.value from json_each($${column}))`;
    }
    if (param instanceof RegExp) {
      return `${column} like $${column}`;
    }
    if (param === null) {
      return `${column} is null`;
    }
    return `${column} = $${column}`;
  }).join(" and ");
};
var convertModifiers = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, param] of Object.entries(query)) {
    if (param instanceof Modifier) {
      result[key] = param.value;
    } else {
      result[key] = param;
    }
  }
  return result;
};
var removeNulls = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
};
var removeUndefined = (query) => {
  if (!query) {
    return query;
  }
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== void 0) {
      result[key] = value;
    }
  }
  return result;
};
var convertPatterns = (params) => {
  const processed = {};
  if (!params) {
    return processed;
  }
  for (const [key, value] of Object.entries(params)) {
    if (value instanceof RegExp) {
      processed[key] = convert(value);
    }
  }
  return processed;
};
var update = async (db, table, query, params, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keys = Object.keys(params);
  verify(keys);
  const set = keys.map((param) => `${param} = $${param}`).join(", ");
  let sql;
  let converted = {};
  if (query) {
    query = removeUndefined(query);
    converted = convertPatterns(query);
    const where = toClause(query, verify);
    query = convertModifiers(query);
    query = removeNulls(query);
    sql = `update ${table} set ${set} where ${where}`;
  } else {
    sql = `update ${table} set ${set}`;
  }
  return await db.run(sql, { ...params, ...query, ...converted }, null, tx);
};
var makeVerify = (table, columnSet) => {
  return (column) => {
    if (typeof column === "string") {
      if (!columnSet.has(column)) {
        throw Error(`Column ${column} does not exist on table ${table}`);
      }
    } else {
      const columns = column;
      for (const column2 of columns) {
        if (!columnSet.has(column2)) {
          throw Error(`Column ${column2} does not exist on table ${table}`);
        }
      }
    }
  };
};
var toSelect = (columns, keywords, table, db, verify) => {
  if (columns) {
    if (typeof columns === "string") {
      verify(columns);
      return columns;
    }
    if (Array.isArray(columns) && columns.length > 0) {
      verify(columns);
      return columns.join(", ");
    }
    if (keywords && keywords.select) {
      const select = keywords.select;
      if (typeof select === "string") {
        verify(select);
        return select;
      }
      if (Array.isArray(select) && select.length > 0) {
        verify(select);
        return select.join(", ");
      }
      return "*";
    }
    if (keywords && keywords.exclude) {
      if (!db.tables[table]) {
        throw Error("Database tables must be set before using exclude");
      }
      return db.tables[table].map((c) => c.name).filter((c) => !keywords.exclude.includes(c)).join(", ");
    }
    return "*";
  } else {
    return "*";
  }
};
var toKeywords = (keywords, verify) => {
  let sql = "";
  if (keywords) {
    if (keywords.orderBy) {
      let orderBy = keywords.orderBy;
      verify(orderBy);
      if (Array.isArray(orderBy)) {
        orderBy = orderBy.join(", ");
      }
      sql += ` order by ${orderBy}`;
      if (keywords.desc) {
        sql += " desc";
      }
    }
    if (keywords.limit !== void 0) {
      if (Number.isInteger(keywords.limit)) {
        sql += ` limit ${keywords.limit}`;
      }
    }
    if (keywords.offset !== void 0) {
      if (Number.isInteger(keywords.offset)) {
        sql += ` offset ${keywords.offset}`;
      }
    }
  }
  return sql;
};
var getVirtual2 = async (db, table, query, tx, keywords, select, returnValue, verify, once) => {
  let params;
  if (keywords && keywords.highlight) {
    const highlight2 = keywords.highlight;
    verify(highlight2.column);
    const index2 = db.tables[table].map((c, i) => ({ name: c.name, index: i })).find((c) => c.name === highlight2.column).index - 1;
    params = {
      index: index2,
      startTag: highlight2.tags[0],
      endTag: highlight2.tags[1]
    };
    select = `rowid as id, highlight(${table}, $index, $startTag, $endTag) as highlight`;
  }
  if (keywords && keywords.snippet) {
    const snippet = keywords.snippet;
    verify(snippet.column);
    const index2 = db.tables[table].map((c, i) => ({ name: c.name, index: i })).find((c) => c.name === highlight.column).index - 1;
    params = {
      index: index2,
      startTag: snippet.tags[0],
      endTag: snippet.tags[1],
      trailing: snippet.trailing,
      tokens: snippet.tokens
    };
    select = `rowid as id, snippet(${table}, $index, $startTag, $endTag, $trailing, $tokens) as snippet`;
  }
  let sql = `select ${select} from ${table}`;
  if (query) {
    params = { ...params, ...query };
    const statements = [];
    for (const column of Object.keys(query)) {
      verify(column);
      statements.push(`${column} match $${column}`);
    }
    sql += ` where ${statements.join(" and ")}`;
  }
  if (keywords.rank) {
    sql += " order by rank";
  }
  if (keywords.bm25) {
    sql += ` order by bm25(${table}, `;
    const values = [];
    for (const column of db.tables[table]) {
      if (column.name === "rowid") {
        continue;
      }
      const value = keywords.bm25[column.name];
      if (typeof value === "number") {
        values.push(value);
      }
    }
    sql += values.join(", ");
    sql += ")";
  }
  sql += toKeywords(keywords, verify);
  const results = await db.all(sql, params, null, tx);
  if (once) {
    if (results.length === 0) {
      return void 0;
    }
    if (returnValue) {
      const result = results[0];
      const key = Object.keys(result)[0];
      return result[key];
    }
    return results[0];
  }
  if (results.length === 0) {
    return results;
  }
  if (returnValue) {
    const key = Object.keys(results[0])[0];
    return results.map((r) => r[key]);
  }
  return results;
};
var exists = async (db, table, query, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `select exists(select 1 from ${table}`;
  query = removeUndefined(query);
  const converted = convertPatterns(query);
  const where = toClause(query, verify);
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += ") as result";
  const results = await db.all(sql, { ...query, ...converted }, null, tx);
  if (results.length > 0) {
    return Boolean(results[0].result);
  }
  return void 0;
};
var count = async (db, table, query, keywords, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = "select ";
  if (keywords && keywords.distinct) {
    sql += "distinct ";
  }
  sql += `count(*) as count from ${table}`;
  query = removeUndefined(query);
  const converted = convertPatterns(query);
  const where = toClause(query, verify);
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  const results = await db.all(sql, { ...query, ...converted }, null, tx);
  if (results.length > 0) {
    return results[0].count;
  }
  return void 0;
};
var get = async (db, table, query, columns, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keywords = columns && typeof columns !== "string" && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords, table, db, verify);
  const returnValue = typeof columns === "string" || keywords && typeof keywords.select === "string";
  if (db.virtualSet.has(table)) {
    return await getVirtual2(db, table, query, tx, keywords, select, returnValue, verify, true);
  }
  let sql = "select ";
  if (keywords && keywords.distinct) {
    sql += "distinct ";
  }
  sql += `${select} from ${table}`;
  query = removeUndefined(query);
  const converted = convertPatterns(query);
  const where = toClause(query, verify);
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const results = await db.all(sql, { ...query, ...converted }, null, tx);
  if (results.length > 0) {
    const result = results[0];
    const adjusted = {};
    const entries = Object.entries(result);
    for (const [key, value] of entries) {
      adjusted[key] = db.convertToJs(table, key, value);
    }
    if (returnValue) {
      return adjusted[entries[0][0]];
    }
    return adjusted;
  }
  return void 0;
};
var all = async (db, table, query, columns, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  const keywords = columns && typeof columns !== "string" && !Array.isArray(columns) ? columns : null;
  const select = toSelect(columns, keywords, table, db, verify);
  const returnValue = typeof columns === "string" || keywords && typeof keywords.select === "string" || keywords && keywords.count;
  if (db.virtualSet.has(table)) {
    return await getVirtual2(db, table, query, tx, keywords, select, returnValue, verify, false);
  }
  let sql = "select ";
  if (keywords && keywords.distinct) {
    sql += "distinct ";
  }
  sql += `${select} from ${table}`;
  query = removeUndefined(query);
  const converted = convertPatterns(query);
  const where = toClause(query, verify);
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  sql += toKeywords(keywords, verify);
  const rows = await db.all(sql, { ...query, ...converted }, null, tx);
  if (rows.length === 0) {
    return rows;
  }
  const sample = rows[0];
  const keys = Object.keys(sample);
  const needsParsing = db.needsParsing(table, keys);
  let adjusted;
  if (needsParsing) {
    adjusted = [];
    for (const row of rows) {
      const created = {};
      for (const [key, value] of Object.entries(row)) {
        created[key] = db.convertToJs(table, key, value);
      }
      adjusted.push(created);
    }
  } else {
    adjusted = rows;
  }
  if (returnValue) {
    if (keywords && keywords.count) {
      return adjusted[0].count;
    }
    const key = keys[0];
    return adjusted.map((item) => item[key]);
  }
  return adjusted;
};
var remove = async (db, table, query, tx) => {
  const columnSet = db.columnSets[table];
  const verify = makeVerify(table, columnSet);
  let sql = `delete from ${table}`;
  query = removeUndefined(query);
  const converted = convertPatterns(query);
  const where = toClause(query, verify);
  query = convertModifiers(query);
  query = removeNulls(query);
  if (where) {
    sql += ` where ${where}`;
  }
  return await db.run(sql, { ...query, ...converted }, null, tx);
};

// src/proxy.js
var import_path2 = require("path");
var import_pluralize2 = __toESM(require("pluralize"), 1);

// src/parsers/preprocessor.js
var subqueries = (sql, tables) => {
  const fragments = [];
  const blanked = blank(sql);
  const matches = blanked.matchAll(/\((?<query>[^)]+)\)/gmid);
  let lastEnd = 0;
  for (const match of matches) {
    const [start, end] = match.indices.groups.query;
    const query = sql.substring(start, end);
    if (/^\s*select\s/mi.test(query)) {
      const adjusted = objectStar(query, tables);
      if (adjusted !== query) {
        if (lastEnd !== start) {
          fragments.push(sql.substring(lastEnd, start));
        }
        fragments.push(adjusted);
        lastEnd = end;
      }
    }
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join("");
};
var processObjectStar = (sql, tables) => {
  const fragments = [];
  tables = { ...tables };
  const blanked = blank(sql);
  let lastEnd = 0;
  if (/^\s*with\s/mi.test(blanked)) {
    const matches = blanked.matchAll(/(\s|,)(?<tableName>[a-z0-9_]+)\s(?<asType>\s(as|as materialized|as not materialized)\s\()(?<query>[^)]+)\)/gmid);
    for (const match of matches) {
      const tableName = match.groups.tableName;
      const [start2, end2] = match.indices.groups.query;
      const query2 = sql.substring(start2, end2);
      const columns = parseQuery(query2, tables);
      const adjusted2 = objectStar(query2, tables);
      tables[tableName] = columns;
      if (adjusted2 !== query2) {
        if (lastEnd !== start2) {
          fragments.push(sql.substring(lastEnd, start2));
        }
        fragments.push(adjusted2);
        lastEnd = end2;
      }
    }
    const selectMatch = /\)\s*(?<query>select\s.+$)/gmids.exec(blanked);
    const [start, end] = selectMatch.indices.groups.query;
    const query = sql.substring(start, end);
    if (start !== lastEnd) {
      fragments.push(sql.substring(lastEnd, start));
    }
    const adjusted = objectStar(query, tables);
    fragments.push(adjusted);
    return fragments.join("");
  }
  if (/^\s*select\s/mi.test(blanked)) {
    return objectStar(sql, tables);
  }
  return sql;
};
var objectStar = (sql, tables) => {
  const fragments = [];
  const blanked = blank(sql);
  const match = /^\s*select\s+(distinct\s)?(?<select>.+?)\s+from\s+.+$/gmids.exec(blanked);
  if (!match) {
    return sql;
  }
  const [start, end] = match.indices.groups.select;
  const select = sql.substring(start, end);
  const blankedSelect = blank(select, { stringsOnly: true });
  let lastEnd = 0;
  if (/json_object\(([a-z0-9_]+\.)?\*\)/i.test(blankedSelect)) {
    const columns = parseQuery(sql, tables);
    const matches1 = Array.from(blankedSelect.matchAll(/json_object\(\s*(?<functionContent>([a-z0-9_]+\.)?\*)\s*\)\s+as\s+(?<columnName>[a-z0-9_]+)/gmid));
    const matches2 = Array.from(blankedSelect.matchAll(/json_group_array\(\s*json_object\(\s*(?<functionContent>([a-z0-9_]+\.)?\*)\s*\)\s*\)\s+as\s+(?<columnName>[a-z0-9_]+)/gmid));
    const matches = matches1.concat(matches2);
    for (const match2 of matches) {
      const columnName = match2.groups.columnName;
      const [contentStart, contentEnd] = match2.indices.groups.functionContent;
      const column = columns.find((c) => c.name === columnName);
      if (lastEnd !== start + contentStart) {
        fragments.push(sql.substring(lastEnd, start + contentStart));
      }
      const expanded = [];
      for (const starColumn of column.starColumns) {
        const split = starColumn.split(".");
        const name = split.length === 1 ? split[0] : split[1];
        expanded.push(`'${name}', ${starColumn}`);
      }
      fragments.push(expanded.join(", "));
      lastEnd = start + contentEnd;
    }
  }
  fragments.push(sql.substring(lastEnd));
  let adjusted = fragments.join("");
  adjusted = subqueries(adjusted, tables);
  return adjusted;
};
var expandStar = (sql, tables, isView) => {
  const fragments = [];
  const columns = parseQuery(sql, tables);
  if (!columns) {
    return sql;
  }
  const blanked = blank(sql);
  const match = /^\s*(create\s+view\s+[^\s]+\s+as\s+)?select\s+(distinct\s)?(?<select>.+?)\s+from\s+.+$/gmids.exec(blanked);
  if (!match) {
    return sql;
  }
  const [start, end] = match.indices.groups.select;
  const select = sql.substring(start, end);
  const matches = blank(select).matchAll(/(?<statement>[^,]+)(,|$)/gmd);
  let lastEnd = 0;
  let i = 0;
  const duplicates = /* @__PURE__ */ new Set();
  for (const match2 of matches) {
    const [statementStart, statementEnd] = match2.indices.groups.statement;
    const statement = select.substring(statementStart, statementEnd).trim();
    if (/^([a-z0-9_]+\.)?\*$/gmi.test(statement)) {
      if (lastEnd !== start + statementStart) {
        fragments.push(sql.substring(lastEnd, start + statementStart));
      }
      lastEnd = start + statementEnd;
      const split = statement.split(".");
      let tableAlias;
      if (split.length > 1) {
        tableAlias = split[0];
      }
      const tableColumns = columns.filter((c) => c.partOf === statement);
      const expanded = [];
      for (const column of tableColumns) {
        let adjusted;
        if (duplicates.has(column.name)) {
          if (isView) {
            continue;
          }
          adjusted = `flyweight${i}_${column.name}`;
          i++;
        } else {
          adjusted = column.name;
          duplicates.add(column.name);
        }
        let statement2 = "";
        if (tableAlias) {
          statement2 += tableAlias + ".";
        }
        if (adjusted !== column.name) {
          statement2 += `${column.name} as ${adjusted}`;
        } else {
          statement2 += column.name;
        }
        expanded.push(statement2);
      }
      let fragment = "";
      if (!/\n\s*$/.test(fragments.at(-1))) {
        fragment += "\n    ";
      }
      fragment += expanded.join(",\n    ");
      fragments.push(fragment);
    } else {
      let name;
      const aliasMatch = /.+\s+as\s+(?<alias>[a-z0-9_]+)$/gmids.exec(statement);
      if (aliasMatch) {
        name = aliasMatch.groups.alias;
      } else {
        name = statement.split(".").at(-1);
      }
      if (duplicates.has(name)) {
        let adjusted;
        if (aliasMatch) {
          adjusted = statement.replace(/\s+as\s+[a-z0-9_]+$/gmid, "");
        } else {
          adjusted = statement;
        }
        adjusted += ` as flyweight${i}_${name}`;
        i++;
        if (lastEnd !== start + statementStart) {
          fragments.push(sql.substring(lastEnd, start + statementStart));
        }
        lastEnd = start + statementEnd;
        fragments.push(adjusted);
      } else {
        duplicates.add(name);
      }
    }
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join("");
};
var processGroups = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/(^|,|\s|\()(?<groupArray>groupArray\((?<functionContent>[^)]+)\))/gmid);
  for (const match of matches) {
    const [start, end] = match.indices.groups.groupArray;
    if (lastEnd !== start) {
      fragments.push(sql.substring(lastEnd, start));
    }
    lastEnd = end;
    const [contentStart, contentEnd] = match.indices.groups.functionContent;
    const functionContent = sql.substring(contentStart, contentEnd);
    const starMatch = /^\s*([a-z0-9_]\.)?\*\s*$/mi.test(functionContent);
    if (starMatch || blank(functionContent).includes(",")) {
      fragments.push(`json_group_array(object(${functionContent}))`);
    } else {
      fragments.push(`json_group_array(${functionContent})`);
    }
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join("");
};
var processArrays = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/(^|,|\s|\()(?<array>array\()/gmid);
  for (const match of matches) {
    const [start, end] = match.indices.groups.array;
    if (lastEnd !== start) {
      fragments.push(sql.substring(lastEnd, start));
    }
    lastEnd = end;
    fragments.push("json_array(");
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join("");
};
var processObjects = (sql, fragments = []) => {
  const blanked = blank(sql, { stringsOnly: true });
  const objectMatch = /(^|,|\s|\()(?<object>object\s*\()/gmid.exec(blanked);
  if (!objectMatch) {
    fragments.push(sql);
    return fragments.join("");
  }
  const columns = [];
  const [objectStart] = objectMatch.indices.groups.object;
  const processed = blank(sql.substring(objectStart));
  const processedMatch = /(^|,|\s|\()(?<object>object\s*\((?<columns>[^)]+)\))/gmid.exec(processed);
  const [start, end] = processedMatch.indices.groups.columns;
  const columnsText = sql.substring(objectStart + start, objectStart + end);
  if (/^([a-z0-9_]+\.)?\*$/i.test(columnsText)) {
    fragments.push(sql.substring(0, objectStart));
    fragments.push(`json_object(${columnsText})`);
    const objectEnd2 = objectStart + processedMatch.indices.groups.object[1];
    return processObjects(sql.substring(objectEnd2), fragments);
  }
  const columnMatches = blank(columnsText).matchAll(/(?<column>[^,]+)(,|$)/gmid);
  for (const columnMatch of columnMatches) {
    const [columnStart, columnEnd] = columnMatch.indices.groups.column;
    let column = columnsText.substring(columnStart, columnEnd);
    while (true) {
      const processed2 = processObjects(column);
      if (processed2 === column) {
        break;
      } else {
        column = processed2;
      }
    }
    const aliasMatch = /(?<value>^.+)\s+as\s+(?<alias>[a-z0-9_]+)\s*$/gmid.exec(blank(column));
    if (aliasMatch) {
      const [valueStart, valueEnd] = aliasMatch.indices.groups.value;
      const value = column.substring(valueStart, valueEnd).trim();
      const name = aliasMatch.groups.alias;
      columns.push({
        name,
        value
      });
    } else {
      const name = column.split(".").at(-1).trim();
      const value = column.trim();
      columns.push({
        name,
        value
      });
    }
  }
  fragments.push(sql.substring(0, objectStart));
  fragments.push(`json_object(${columns.map((c) => `'${c.name}', ${c.value}`).join(", ")})`);
  const objectEnd = objectStart + processedMatch.indices.groups.object[1];
  return processObjects(sql.substring(objectEnd), fragments);
};
var processInClause = (sql) => {
  const fragments = [];
  let lastEnd = 0;
  const blanked = blank(sql, { stringsOnly: true });
  const matches = blanked.matchAll(/\s(?<clause>in\s+\$(?<param>[a-z0-9_]+))/gmid);
  for (const match of matches) {
    const [start, end] = match.indices.groups.clause;
    if (lastEnd !== start) {
      fragments.push(sql.substring(lastEnd, start));
    }
    lastEnd = end;
    fragments.push(`in (select json_each.value from json_each($${match.groups.param}))`);
  }
  fragments.push(sql.substring(lastEnd));
  return fragments.join("");
};
var preprocess = (sql, tables, isView) => {
  sql = processGroups(sql);
  sql = processArrays(sql);
  sql = processObjects(sql);
  sql = expandStar(sql, tables, isView);
  sql = processObjectStar(sql, tables);
  sql = processInClause(sql);
  return sql;
};

// src/proxy.js
var queries = {
  insert: (database, table, tx) => async (params) => await insert(database, table, params, tx),
  insertMany: (database, table, tx) => async (items) => await insertMany(database, table, items, tx),
  update: (database, table, tx) => async (params, query) => await update(database, table, params, query, tx),
  exists: (database, table, tx) => async (query) => await exists(database, table, query, tx),
  count: (database, table, tx) => async (query, keywords) => await count(database, table, query, keywords, tx),
  get: (database, table, tx) => async (query, columns) => await get(database, table, query, columns, tx),
  all: (database, table, tx) => async (query, columns) => await all(database, table, query, columns, tx),
  remove: (database, table, tx) => async (query) => await remove(database, table, query, tx)
};
var singularQueries = {
  insert: queries.insert,
  update: queries.update,
  exists: queries.exists,
  get: queries.get,
  remove: queries.remove
};
var multipleQueries = {
  insert: queries.insertMany,
  update: queries.update,
  count: queries.count,
  get: queries.all,
  remove: queries.remove
};
var convertItem = (item, converters) => {
  for (const converter of converters) {
    const keys = converter.keys;
    const count2 = keys.length;
    let i = 0;
    let actual = item;
    for (const key of keys) {
      if (i + 1 === count2) {
        if (actual[key] !== null) {
          actual[key] = converter.converter(actual[key]);
        }
      }
      actual = actual[key];
      i++;
    }
  }
};
var getConverters = (key, value, db, converters, keys = [], optional = []) => {
  keys.push(key);
  if (typeof value.type === "string") {
    optional.push(value.isOptional);
    if (value.functionName && /^json_/i.test(value.functionName)) {
      return;
    }
    const converter = db.getDbToJsConverter(value.type);
    if (converter) {
      converters.push({
        keys: [...keys],
        converter
      });
    }
    return;
  } else {
    for (const [k, v] of Object.entries(value.type)) {
      getConverters(k, v, db, converters, [...keys], optional);
    }
  }
};
var allNulls = (item) => {
  if (item === null) {
    return true;
  }
  for (const value of Object.values(item)) {
    if (value === null) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
      return false;
    }
    const isNull = allNulls(value);
    if (!isNull) {
      return false;
    }
  }
  return true;
};
var makeOptions = (columns, db) => {
  const columnMap = {};
  let typeMap3 = null;
  for (const column of columns) {
    columnMap[column.name] = column.name.replace(/^flyweight\d+_/, "");
    const converter = db.getDbToJsConverter(column.type);
    let actualConverter = converter;
    if (converter) {
      if (!typeMap3) {
        typeMap3 = {};
      }
      const structured = column.structuredType;
      if (structured) {
        if (column.functionName === "json_group_array") {
          const structuredType = structured.type;
          if (typeof structuredType === "string") {
            const structuredConverter = db.getDbToJsConverter(structuredType);
            actualConverter = (v) => {
              let converted = converter(v);
              converted = converted.filter((v2) => v2 !== null);
              if (structuredType === "text") {
                converted.sort((a, b) => a.localeCompare(b));
              }
              if (structuredType === "integer" || structuredType === "real") {
                converted.sort((a, b) => a - b);
              }
              if (structuredConverter && !(structured.functionName && /^json_/i.test(structured.functionName))) {
                converted = converted.map((i) => structuredConverter(i));
                if (structuredType === "date") {
                  converted.sort((a, b) => b.getTime() - a.getTime());
                }
              }
              return converted;
            };
          } else {
            const converters = [];
            const optional = [];
            for (const [key, value] of Object.entries(structuredType)) {
              getConverters(key, value, db, converters, [], optional);
            }
            const isOptional = !optional.some((o) => o === false);
            if (converters.length > 0) {
              actualConverter = (v) => {
                const converted = converter(v);
                for (const item of converted) {
                  convertItem(item, converters);
                }
                if (isOptional) {
                  return converted.filter((c) => !allNulls(c));
                }
                return converted;
              };
            } else if (isOptional) {
              actualConverter = (v) => {
                const converted = converter(v);
                return converted.filter((c) => !allNulls(c));
              };
            }
          }
        } else if (column.functionName === "json_object") {
          const structuredType = structured.type;
          const converters = [];
          const optional = [];
          for (const [key, value] of Object.entries(structuredType)) {
            getConverters(key, value, db, converters, [], optional);
          }
          const isOptional = !optional.some((o) => o === false);
          if (converters.length > 0) {
            actualConverter = (v) => {
              const converted = converter(v);
              convertItem(converted, converters);
              if (allNulls(converted)) {
                return null;
              }
              return converted;
            };
          } else if (isOptional) {
            actualConverter = (v) => {
              const converted = converter(v);
              if (allNulls(converted)) {
                return null;
              }
              return converted;
            };
          }
        } else if (column.functionName === "json_array") {
          const converters = [];
          let i = 0;
          for (const type of structured) {
            getConverters(i, type, db, converters);
            i++;
          }
          if (converters.length > 0) {
            actualConverter = (v) => {
              const converted = converter(v);
              convertItem(converted, converters);
              return converted;
            };
          }
        }
      }
      typeMap3[column.name] = actualConverter;
    }
  }
  const options = {
    parse: true,
    map: true
  };
  options.columns = columnMap;
  options.types = typeMap3;
  return options;
};
var getResultType = (columns, isSingular) => {
  if (columns.length === 0) {
    return "none";
  } else if (isSingular) {
    if (columns.length === 1) {
      return "value";
    } else {
      return "object";
    }
  } else {
    if (columns.length === 1) {
      return "values";
    } else {
      return "array";
    }
  }
};
var makeQueryHandler = (table, db, sqlDir, tx) => {
  let isSingular;
  let queries2;
  if (import_pluralize2.default.isSingular(table)) {
    isSingular = true;
    table = import_pluralize2.default.plural(table);
    queries2 = singularQueries;
  } else {
    isSingular = false;
    queries2 = multipleQueries;
  }
  return {
    get: function(target, query, receiver) {
      if (!target[query]) {
        if (!sqlDir) {
          if (!queries2[query]) {
            throw Error(`Query ${query} of table ${table} not found`);
          } else {
            target[query] = queries2[query](db, table, tx);
          }
        } else {
          const path = (0, import_path2.join)(sqlDir, table, `${query}.sql`);
          let sql;
          try {
            sql = (0, import_fs.readFileSync)(path, "utf8");
            sql = preprocess(sql, db.tables);
          } catch (e) {
            const makeQuery = isSingular ? singularQueries[query] : multipleQueries[query];
            if (makeQuery) {
              target[query] = makeQuery(db, table, tx);
              return target[query];
            } else {
              throw e;
            }
          }
          const write = isWrite(sql);
          try {
            const columns = parseQuery(sql, db.tables);
            const options = makeOptions(columns, db);
            options.result = getResultType(columns, isSingular);
            let run;
            if (options.result === "none") {
              run = db.run;
            } else {
              run = db.all;
            }
            run = run.bind(db);
            options.cacheName = `${table}.${query}`;
            target[query] = async (params) => {
              return await run(sql, params, options, tx, write);
            };
          } catch {
            target[query] = async (params) => {
              return await db.all(sql, params, null, tx, write);
            };
          }
        }
      }
      return target[query];
    }
  };
};
var makeClient = (db, sqlDir, tx) => {
  const tableHandler = {
    get: function(target, table, receiver) {
      if (["begin", "commit", "rollback"].includes(table)) {
        db[table] = db[table].bind(db);
        return () => db[table](tx);
      }
      if (table === "getTransaction") {
        db[table] = db[table].bind(db);
        return db[table];
      }
      if (table === "release") {
        return (tx2) => db.pool.push(tx2);
      }
      if (!target[table]) {
        target[table] = new Proxy({}, makeQueryHandler(table, db, sqlDir, tx));
      }
      return target[table];
    }
  };
  return new Proxy({}, tableHandler);
};

// src/parsers/types.js
var import_promises2 = require("fs/promises");
var import_pluralize3 = __toESM(require("pluralize"), 1);
var import_path3 = require("path");

// src/parsers/files.js
var index = `interface QueryOptions {
  parse: boolean;
}

interface CustomType {
  name: string;
  valueTest?: (v: any) => boolean;
  makeConstraint?: (column: string) => string;
  dbToJs?: (v: any) => any;
  jsToDb?: (v: any) => any;
  tsType?: string;
  dbType: string;
}

interface Paths {
  db: string | URL;
  sql?: string | URL;
  tables: string | URL;
  views?: string | URL;
  types?: string | URL;
  migrations?: string | URL;
  extensions?: string | URL | Array<string | URL>;
}

interface Initialize<T> {
  db: T;
  makeTypes(): Promise<void>;
  getTables(): Promise<string>;
  createMigration(name: string): Promise<void>;
  runMigration(name: string): Promise<void>;
}

declare class Database {
  constructor();
  initialize<T>(paths: Paths, interfaceName?: string): Promise<Initialize<T>>;
  registerTypes(customTypes: Array<CustomType>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(query: any, params?: any): Promise<number>;
  all<T>(query: any, params?: any, options?: QueryOptions): Promise<Array<T>>;
  exec(query: string): Promise<void>;
  close(): Promise<void>;
}

declare class Modifier {
  constructor(name: string, value: any, operator: string);
  name: string;
  value: any;
  operator: string
}

declare function not(value: any): Modifier | undefined;
declare function gt(value: any): Modifier | undefined;
declare function gte(value: any): Modifier | undefined;
declare function lt(value: any): Modifier | undefined;
declare function lte(value: any): Modifier | undefined;

export {
  Database,
  not,
  gt,
  gte,
  lt,
  lte
}
`;
var interfaces = `export interface Keywords<T> {
  select: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithExclude<T> {
  exclude: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithoutSelect {
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface VirtualKeywordsSelect<T, K> {
  select: K;
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  limit?: number;
  offset?: number;
}

export interface VirtualKeywordsHighlight<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  highlight: { column: keyof T, tags: [string, string] };
  limit?: number;
  offset?: number;
}

export interface VirtualKeywordsSnippet<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  snippet: { column: keyof T, tags: [string, string], trailing: string, tokens: number };
  limit?: number;
  offset?: number;
}

export interface SingularVirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Pick<T, K> | undefined>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
}

export interface MultipleVirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Array<Pick<T, K>>>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface SingularQueries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get(params: W | null, keywords: KeywordsWithoutSelect): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K>): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K[]>): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | undefined>;
  exists(params: W | null): Promise<boolean>;
  remove(params?: W): Promise<number>;
}

export interface MultipleQueries<T, I, W> {
  [key: string]: any;
  insert(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  get(params: W | null, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K>): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  count(params: W | null, keywords?: { distinct: true }): Promise<number>;
  remove(params?: W): Promise<number>;
}`;
var files = {
  index,
  interfaces
};
var files_default = files;

// src/parsers/types.js
var capitalize = (word) => word[0].toUpperCase() + word.substring(1);
var typeMap = {
  integer: "number",
  real: "number",
  text: "string",
  blob: "Buffer",
  any: "number | string | Buffer"
};
var functionTypes = {
  instr: "number | null",
  sign: "number | null",
  json_array: "Array<any>",
  json_array_length: "number",
  json_object: "{ [key: string]: any }",
  json_type: "string | null",
  json_valid: "number",
  json_group_array: "Array<any>",
  json_group_object: "{ [key: string]: any }"
};
var hasNull = (tsType) => {
  return tsType.split("|").map((t) => t.trim()).some((t) => t === "null");
};
var removeOptional = (tsType) => tsType.replace(/ \| optional$/, "");
var removeNull = (tsType) => tsType.replace(/ \| null($| )/, "");
var convertOptional = (tsType) => {
  if (hasNull(tsType)) {
    return removeOptional(tsType);
  }
  return tsType.replace(/ \| optional$/, " | null");
};
var getTsType = (column, customTypes) => {
  if (column.types) {
    const types = [];
    for (const item of column.types) {
      types.push(toTsType(item, customTypes));
    }
    let split = types.join(" | ").split(" | ");
    const optional = split.find((s) => s === "optional");
    if (optional) {
      split = split.filter((s) => s !== "optional");
    }
    const unique = new Set(split);
    let joined = Array.from(unique.values()).join(" | ");
    if (optional) {
      joined += " | optional";
    }
    return joined;
  }
  return toTsType(column, customTypes);
};
var getOptional = (structuredType, optional) => {
  if (typeof structuredType.type === "string") {
    optional.push(structuredType.isOptional);
    return;
  } else {
    for (const value of Object.values(structuredType.type)) {
      getOptional(value, optional);
    }
  }
};
var toTsType = (column, customTypes) => {
  let tsType;
  const { type, functionName, notNull, isOptional, structuredType } = column;
  if (structuredType) {
    if (functionName === "json_group_array") {
      const structured = structuredType;
      if (typeof structured.type !== "string") {
        if (Array.isArray(structured.type)) {
          const optional2 = [];
          getOptional(structured, optional2);
          const isOptional3 = !optional2.some((o) => o === false);
          const types2 = [];
          for (const value of structured.type) {
            let type2 = getTsType(value, customTypes);
            if (isOptional3) {
              type2 = removeOptional(type2);
            } else {
              type2 = convertOptional(type2);
            }
            types2.push(type2);
          }
          return `Array<[${types2.join(", ")}]>`;
        }
        const optional = [];
        getOptional(structured, optional);
        const isOptional2 = !optional.some((o) => o === false);
        const types = [];
        for (const [key, value] of Object.entries(structured.type)) {
          let type2 = getTsType(value, customTypes);
          if (isOptional2) {
            type2 = removeOptional(type2);
          } else {
            type2 = convertOptional(type2);
          }
          types.push(`${key}: ${type2}`);
        }
        return `Array<{ ${types.join(", ")} }>`;
      }
      if (structured.type !== "json") {
        let tsType2;
        if (typeMap[structured.type]) {
          tsType2 = typeMap[structured.type];
        } else {
          tsType2 = customTypes[structured.type].tsType;
        }
        return `Array<${removeNull(convertOptional(tsType2))}>`;
      }
    } else if (functionName === "json_object") {
      const structured = structuredType.type;
      const types = [];
      const optional = [];
      getOptional(structuredType, optional);
      const isOptional2 = !optional.some((o) => o === false);
      for (const [key, value] of Object.entries(structured)) {
        let type3 = getTsType(value, customTypes);
        if (isOptional2) {
          type3 = removeOptional(type3);
        } else {
          type3 = convertOptional(type3);
        }
        types.push(`${key}: ${type3}`);
      }
      let type2 = `{ ${types.join(", ")} }`;
      if (isOptional2) {
        type2 += " | null";
      }
      return type2;
    } else if (functionName === "json_array") {
      const types = [];
      for (const type2 of structuredType) {
        types.push(convertOptional(getTsType(type2, customTypes)));
      }
      return `[${types.join(", ")}]`;
    }
  }
  if (!tsType) {
    if (typeMap[type]) {
      tsType = typeMap[type];
    } else {
      const customType = customTypes[type];
      if (!customType) {
        throw Error(`The type "${type}" has not been registered.`);
      }
      tsType = customTypes[type].tsType;
    }
  }
  if (functionName) {
    const functionType = functionTypes[functionName];
    if (functionType) {
      tsType = functionType;
    }
    if (functionName === "min" || functionName === "max") {
      tsType += " | null";
    }
  }
  if (!notNull && !hasNull(tsType) && tsType !== "any") {
    tsType += " | null";
  }
  if (isOptional) {
    tsType += " | optional";
  }
  return tsType;
};
var parseParams = (sql) => {
  const processed = blank(sql, { stringsOnly: true });
  const matches = processed.matchAll(/(\s|,|\()\$(?<param>[a-z0-9_]+)(\s|,|\)|$)/gmi);
  const params = {};
  for (const match of matches) {
    params[match.groups.param] = true;
  }
  return Object.keys(params);
};
var makeUnique = (name, typeSet, i) => {
  if (typeSet.has(name)) {
    name = `${name}${i}`;
    i++;
  } else {
    typeSet.add(name);
  }
  return name;
};
var getQueries = async (db, sqlDir, tableName, typeSet, i) => {
  const path = (0, import_path3.join)(sqlDir, tableName);
  let fileNames;
  try {
    fileNames = await (0, import_promises2.readdir)(path);
  } catch {
    return null;
  }
  const parsedQueries = [];
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".sql")) {
      continue;
    }
    const queryName = fileName.substring(0, fileName.length - 4);
    const queryPath = (0, import_path3.join)(path, fileName);
    let sql = await (0, import_promises2.readFile)(queryPath, "utf8");
    sql = preprocess(sql, db.tables);
    const params = parseParams(sql);
    let columns;
    try {
      columns = parseQuery(sql, db.tables);
      if (!columns) {
        throw Error("Error parsing query.");
      }
    } catch {
      parsedQueries.push({
        queryName,
        interfaceName: "any",
        params
      });
      continue;
    }
    if (columns.length === 0) {
      parsedQueries.push({
        queryName,
        params
      });
      continue;
    }
    if (columns.length === 1) {
      const tsType = getTsType(columns[0], db.customTypes);
      parsedQueries.push({
        queryName,
        interfaceName: convertOptional(tsType),
        params
      });
      continue;
    }
    const interfaceName = makeUnique(capitalize(tableName) + capitalize(queryName), typeSet, i);
    let interfaceString = `export interface ${interfaceName} {
`;
    const sample = {};
    for (const column of columns) {
      const tsType = getTsType(column, db.customTypes);
      sample[column.name] = tsType;
    }
    const options = makeOptions(columns, db);
    const makeProperties = (sample2) => {
      sample2 = renameColumns(sample2, options.columns);
      let interfaceString2 = "";
      for (const [key, type] of Object.entries(sample2)) {
        if (typeof type === "string") {
          interfaceString2 += `  ${key}: ${convertOptional(type)};
`;
        } else {
          const types = [];
          const foreignKeyName = Object.keys(type)[0];
          const foreignKeyType = type[foreignKeyName];
          const optional = hasNull(foreignKeyType);
          for (const [k, t] of Object.entries(type)) {
            let type2;
            if (k === foreignKeyName && optional) {
              type2 = t.split(" | ").filter((t2) => t2 !== "null").join(" | ");
            } else {
              type2 = t;
            }
            types.push(`${k}: ${removeOptional(type2)}`);
          }
          const colon = optional ? "?:" : ":";
          const properties = types.join("; ");
          interfaceString2 += `  ${key}${colon} { ${properties} };
`;
        }
      }
      return interfaceString2;
    };
    interfaceString += makeProperties(sample);
    interfaceString += `}
`;
    parsedQueries.push({
      queryName,
      interfaceName,
      interfaceString,
      params
    });
  }
  const multipleInterfaceName = makeUnique(capitalize(tableName) + "Queries", typeSet, i);
  const singularInterfaceName = makeUnique(capitalize(import_pluralize3.default.singular(tableName)) + "Queries", typeSet, i);
  let multipleInterfaceString = `export interface ${multipleInterfaceName} {
`;
  let singularInterfaceString = `export interface ${singularInterfaceName} {
`;
  for (const query of parsedQueries) {
    const {
      queryName,
      interfaceName,
      params
    } = query;
    const multipleReturnType = interfaceName ? `Promise<Array<${interfaceName}>>` : "Promise<void>";
    const singularReturnType = interfaceName ? `Promise<${interfaceName} | undefined>` : "Promise<void>";
    let paramInterface = "";
    if (params.length > 0) {
      paramInterface += "params: { ";
      for (const param of params) {
        paramInterface += `${param}: any; `;
      }
      paramInterface += "}";
    }
    multipleInterfaceString += `  ${queryName}(${paramInterface}): ${multipleReturnType};
`;
    singularInterfaceString += `  ${queryName}(${paramInterface}): ${singularReturnType};
`;
  }
  multipleInterfaceString += `}
`;
  singularInterfaceString += `}
`;
  const queryInterfaces = parsedQueries.filter((q) => q.interfaceString !== void 0).map((q) => q.interfaceString);
  return {
    multipleInterfaceName,
    singularInterfaceName,
    multipleInterfaceString,
    singularInterfaceString,
    queryInterfaces
  };
};
var createTypes = async (options) => {
  const {
    db,
    sqlDir,
    destinationPath
  } = options;
  let index2 = files_default.index;
  index2 = index2.replace("export default class Database", "export class Database");
  index2 = index2.replace(/export \{[^\}]+\}/, "");
  const definitions = files_default.interfaces;
  const typeSet = /* @__PURE__ */ new Set();
  let i = 1;
  const matches = (index2 + "\n" + definitions).matchAll(/^(export )?(default )?(interface|class) (?<name>[a-z0-9_]+)/gmi);
  for (const match of matches) {
    typeSet.add(match.groups.name.toLowerCase());
  }
  const tables = Object.entries(db.tables).map(([key, value]) => ({ name: key, columns: value }));
  let types = "";
  if (/\.d\.ts/.test(destinationPath)) {
    types += index2;
    types += "\n";
    types = types.replace(/^export class Database {/gm, "declare class Database {");
  }
  types += definitions;
  types += "\n\n";
  const returnTypes2 = [];
  for (const table of tables) {
    const singular = import_pluralize3.default.singular(table.name);
    const capitalized = capitalize(singular);
    const interfaceName = makeUnique(capitalized, typeSet, i);
    const insertInterfaceName = makeUnique(`Insert${interfaceName}`, typeSet, i);
    const whereInterfaceName = makeUnique(`Where${interfaceName}`, typeSet, i);
    const multipleTableName = table.name;
    const singularTableName = singular;
    let multipleReturnType;
    let singularReturnType;
    const primaryKey = table.columns.find((c) => c.primaryKey !== void 0);
    let tsType;
    if (primaryKey) {
      tsType = toTsType({
        type: primaryKey.type,
        notNull: true
      }, db.customTypes);
    } else {
      tsType = "undefined";
    }
    if (db.viewSet.has(table.name)) {
      multipleReturnType = `  ${multipleTableName}: Pick<MultipleQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}>, "get">`;
      singularReturnType = `  ${singularTableName}: Pick<SingularQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}, ${tsType}>, "get">`;
    } else if (db.virtualSet.has(table.name)) {
      multipleReturnType = `  ${multipleTableName}: MultipleVirtualQueries<${interfaceName}, ${whereInterfaceName}>`;
      singularReturnType = `  ${singularTableName}: SingularVirtualQueries<${interfaceName}, ${whereInterfaceName}>`;
    } else {
      multipleReturnType = `  ${multipleTableName}: MultipleQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}>`;
      singularReturnType = `  ${singularTableName}: SingularQueries<${interfaceName}, ${insertInterfaceName}, ${whereInterfaceName}, ${tsType}>`;
    }
    let queries2;
    if (sqlDir) {
      queries2 = await getQueries(db, sqlDir, table.name, typeSet, i);
      if (queries2) {
        multipleReturnType += ` & ${queries2.multipleInterfaceName}`;
        singularReturnType += ` & ${queries2.singularInterfaceName}`;
      }
    }
    returnTypes2.push(multipleReturnType, singularReturnType);
    types += `export interface ${interfaceName} {
`;
    for (const column of table.columns) {
      const { name, type, primaryKey: primaryKey2, notNull } = column;
      const tsType2 = toTsType({
        type,
        notNull: notNull || primaryKey2
      }, db.customTypes);
      let property = `  ${name}`;
      property += ": ";
      property += tsType2;
      property += ";\n";
      types += property;
    }
    types += "}\n\n";
    types += `export interface ${insertInterfaceName} {
`;
    for (const column of table.columns) {
      const { name, type, primaryKey: primaryKey2, notNull, hasDefault } = column;
      const tsType2 = toTsType({
        type,
        notNull: true
      }, db.customTypes);
      let property = `  ${name}`;
      if (primaryKey2 || !notNull || hasDefault) {
        property += "?: ";
      } else {
        property += ": ";
      }
      property += tsType2;
      property += ";\n";
      types += property;
    }
    types += "}\n\n";
    types += `export interface ${whereInterfaceName} {
`;
    for (const column of table.columns) {
      const { name, type, primaryKey: primaryKey2, notNull } = column;
      const tsType2 = toTsType({
        type,
        notNull: true
      }, db.customTypes);
      const customType = db.customTypes[type];
      const dbType = customType ? customType.dbType : type;
      let property = `  ${name}`;
      property += "?: ";
      property += tsType2;
      property += ` | Array<${tsType2}>`;
      if (dbType === "text") {
        property += " | RegExp";
      }
      if (!primaryKey2 && !notNull) {
        property += " | null";
      }
      property += ";\n";
      types += property;
    }
    if (db.virtualSet.has(table.name)) {
      types += `  ${table.name}?: string;
`;
    }
    types += "}\n\n";
    if (queries2) {
      for (const queryInterface of queries2.queryInterfaces) {
        types += queryInterface;
        types += "\n";
      }
      types += queries2.multipleInterfaceString;
      types += "\n";
      types += queries2.singularInterfaceString;
      types += "\n";
    }
  }
  types += `export interface TypedDb {
`;
  types += "  [key: string]: any,\n";
  for (const returnType of returnTypes2) {
    types += returnType + ",\n";
  }
  types += "  begin(): Promise<void>,\n";
  types += "  commit(): Promise<void>,\n";
  types += "  rollback(): Promise<void>,\n";
  types += `  getTransaction(): Promise<TypedDb>,
`;
  types += `  release(transaction: TypedDb): void`;
  types += "\n}\n\n";
  if (/\.d\.ts/.test(destinationPath)) {
    types = types.replaceAll(/^export /gm, "");
    types += `declare const database: Database;
`;
    types += `declare const db: TypedDb;
`;
    types += "declare function makeTypes(): Promise<void>;\n";
    types += "declare function getTables(): Promise<string>;\n";
    types += "declare function createMigration(name: string): Promise<void>;\n";
    types += "declare function runMigration(name: string): Promise<void>;\n\n";
    types += "export {\n  database,\n  db,\n  makeTypes,\n  getTables,\n  createMigration,\n  runMigration\n}\n";
  }
  await (0, import_promises2.writeFile)(destinationPath, types, "utf8");
};

// src/migrations.js
var import_promises3 = require("fs/promises");
var import_path4 = require("path");
var getIndexes = (statements, blanked) => {
  const pattern = /^create\s+(unique\s+)?index\s+(if\s+not\s+exists\s+)?(?<indexName>[a-z0-9_]+)\s+on\s+(?<tableName>[a-z0-9_]+)\([^;]+;/gmid;
  const indexes = [];
  for (const match of blanked.matchAll(pattern)) {
    const [start, end] = match.indices[0];
    const sql = statements.substring(start, end);
    const name = match.groups.indexName;
    const table = match.groups.tableName;
    indexes.push({ name, table, sql });
  }
  return indexes;
};
var getIndexMigrations = (currentIndexes, lastIndexes) => {
  const currentSql = currentIndexes.map((i) => i.sql);
  const lastSql = lastIndexes.map((i) => i.sql);
  const migrations = [];
  const drop = lastIndexes.filter((i) => !currentSql.includes(i.sql)).map((i) => `drop index ${i.name};`);
  migrations.push(...drop);
  const add = currentIndexes.filter((i) => !lastSql.includes(i.sql)).map((i) => i.sql);
  migrations.push(...add);
  return migrations;
};
var getTriggers = (statements, blanked) => {
  const split = blanked.split(/((?:^|\s)create\s)/i);
  const items = [];
  let last;
  let start = 0;
  for (const blanked2 of split) {
    if (/((?:^|\s)create\s)/i.test(blanked2)) {
      last = blanked2;
    } else {
      const item = last + statements.substring(start, start + blanked2.length);
      items.push(item);
    }
    start += blanked2.length;
  }
  const triggers = [];
  for (const item of items) {
    const match = /^\s*create\s+trigger\s+(?<triggerName>[a-z0-9_]+)\s/gmi.exec(item);
    if (match) {
      triggers.push({
        name: match.groups.triggerName,
        sql: item.trim()
      });
    }
  }
  return triggers;
};
var getTriggerMigrations = (currentTriggers, lastTriggers) => {
  const migrations = [];
  const actionedLastTriggers = [];
  for (const trigger of currentTriggers) {
    const lastTrigger = lastTriggers.find((t) => t.name === trigger.name);
    if (lastTrigger) {
      actionedLastTriggers.push(lastTrigger.name);
      if (lastTrigger.sql === trigger.sql) {
        continue;
      } else {
        migrations.push(`drop trigger ${trigger.name};`);
        migrations.push(trigger.sql);
      }
    } else {
      migrations.push(trigger.sql);
    }
  }
  for (const trigger of lastTriggers) {
    if (!actionedLastTriggers.includes(trigger.name)) {
      migrations.push(`drop trigger ${trigger.name};`);
    }
  }
  return migrations;
};
var getVirtualTables = (statements, blanked) => {
  const pattern = /^\s*create\s+virtual\s+table\s+(?<tableName>[a-z0-9_]+)\s+using\s+(?<tableContents>[^;]+);/gmid;
  const matches = blanked.matchAll(pattern);
  const tables = [];
  for (const match of matches) {
    const [start, end] = match.indices[0];
    const sql = statements.substring(start, end);
    const [restStart, restEnd] = match.indices.groups.tableContents;
    const rest = sql.substring(restStart, restEnd);
    tables.push({
      name: match.groups.tableName,
      sql,
      rest
    });
  }
  return tables;
};
var getVirtualMigrations = (currentTables, lastTables) => {
  const migrations = [];
  const currentNames = currentTables.map((t) => t.name);
  const actionedLastTables = [];
  for (const table of currentTables) {
    const lastTable = lastTables.find((t) => t.name === table.name);
    if (lastTable && lastTable.sql === table.sql) {
      actionedLastTables.push(lastTable.name);
      continue;
    }
    if (lastTable && lastTable.sql !== table.sql) {
      migrations.push(`drop table ${table.name};`);
      migrations.push(table.sql);
    }
    if (!lastTable) {
      const sameSql = lastTables.filter((t) => t.rest === table.rest && !currentNames.includes(t.name) && !actionedLastTables.includes(t.name));
      if (sameSql.length > 0) {
        const tableName = sameSql[0].name;
        migrations.push(`alter table ${tableName} rename to ${table.name};`);
        actionedLastTables.push(tableName);
        continue;
      } else {
        migrations.push(table.sql);
      }
    }
  }
  for (const table of lastTables) {
    if (!actionedLastTables.includes(table.name)) {
      migrations.push(`drop table ${table.name};`);
    }
  }
  return migrations;
};
var getTables2 = (sql) => {
  const tables = [];
  const tableMatches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+)\)(?<without>\s+without rowid,)?\s+strict;/gmid);
  for (const tableMatch of tableMatches) {
    const tableName = tableMatch.groups.tableName;
    const [tableStart, tableEnd] = tableMatch.indices[0];
    const tableText = sql.substring(tableStart, tableEnd);
    const blanked = blank(tableMatch.groups.columns);
    const [columnStart, columnEnd] = tableMatch.indices.groups.columns;
    const columnText = sql.substring(columnStart, columnEnd);
    const columnMatches = blanked.matchAll(/(^|,)(?<column>.+)(,|$)/gmid);
    const columns = [];
    const constraints = [];
    for (const columnMatch of columnMatches) {
      const [start, end] = columnMatch.indices.groups.column;
      const text = columnText.substring(start, end);
      let adjusted = text.replaceAll(/\s+/gm, " ").replace(/,$/, "").trim();
      const columnName = adjusted.split(/ |\(/)[0];
      const rest = adjusted.replace(columnName, "").trim();
      if (["unique", "check", "primary", "foreign"].includes(columnName)) {
        constraints.push(adjusted);
      } else {
        columns.push({
          name: columnName,
          sql: adjusted,
          rest
        });
      }
    }
    if (tableMatch.groups.without) {
      constraints.push("without rowid");
    }
    tables.push({
      name: tableName,
      sql: tableText,
      columnText,
      columns,
      constraints
    });
  }
  return tables;
};
var getViews2 = (sql) => {
  const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create\s+view\s+(?<viewName>[a-z0-9_]+)\s+([^;]+);/gmi);
  return Array.from(matches).map((m) => {
    return {
      name: m.groups.viewName,
      sql: m[0]
    };
  });
};
var migrate = async (db, tablesPath, viewsPath, migrationPath, migrationName) => {
  const outputPath = (0, import_path4.join)(migrationPath, `${migrationName}.sql`);
  const lastTablesPath = (0, import_path4.join)(migrationPath, "lastTables.sql");
  const lastViewsPath = (0, import_path4.join)(migrationPath, "lastViews.sql");
  const currentSql = await readSql(tablesPath);
  const current = db.convertTables(currentSql);
  const blankedCurrent = blank(current);
  let last;
  let blankedLast;
  let currentViewsText = "";
  const viewMigrations = [];
  if (viewsPath) {
    currentViewsText = await readSql(viewsPath);
    currentViewsText = currentViewsText.split(";").map((s) => preprocess(s.trim(), db.tables, true)).join(";\n\n").slice(0, -1);
    let lastViewsText;
    try {
      lastViewsText = await readSql(lastViewsPath);
      lastViewsText = lastViewsText.split(";").map((s) => preprocess(s.trim(), db.tables, true)).join(";\n\n").slice(0, -1);
      const currentViews = getViews2(currentViewsText);
      const lastViews = getViews2(lastViewsText);
      const currentViewNames = new Set(currentViews.map((v) => v.name));
      for (const view of currentViews) {
        const lastView = lastViews.find((v) => v.name === view.name);
        if (!lastView) {
          viewMigrations.push(view.sql);
        }
        if (lastView && lastView.sql !== view.sql) {
          viewMigrations.push(`drop view ${view.name};`);
          viewMigrations.push(view.sql);
        }
      }
      for (const view of lastViews) {
        if (!currentViewNames.has(view.name)) {
          viewMigrations.push(`drop view ${view.name};`);
        }
      }
    } catch {
      viewMigrations.push(currentViewsText);
      await (0, import_promises3.writeFile)(lastViewsPath, currentViewsText, "utf8");
    }
  }
  try {
    const lastSql = await readSql(lastTablesPath);
    last = db.convertTables(lastSql);
    blankedLast = blank(last);
  } catch {
    let sql2 = current;
    if (viewMigrations.length > 0) {
      sql2 += "\n";
      sql2 += viewMigrations.join("\n");
      sql2 += "\n";
    }
    await (0, import_promises3.writeFile)(outputPath, sql2, "utf8");
    await (0, import_promises3.writeFile)(lastTablesPath, currentSql, "utf8");
    console.log("Migration created.");
    process.exit();
  }
  const currentTriggers = getTriggers(current, blankedCurrent);
  const lastTriggers = getTriggers(last, blankedLast);
  const triggerMigrations = getTriggerMigrations(currentTriggers, lastTriggers);
  const currentVirtualTables = getVirtualTables(current, blankedCurrent);
  const lastVirtualTables = getVirtualTables(last, blankedLast);
  const virtualMigrations = getVirtualMigrations(currentVirtualTables, lastVirtualTables);
  const currentIndexes = getIndexes(current, blankedCurrent);
  const lastIndexes = getIndexes(last, blankedLast);
  const indexMigrations = getIndexMigrations(currentIndexes, lastIndexes);
  const currentTables = getTables2(current);
  const currentNames = currentTables.map((t) => t.name);
  const lastTables = getTables2(last);
  const tableMigrations = [];
  const columnMigrations = [];
  const actionedCurrentTables = [];
  const actionedLastTables = [];
  for (const table of currentTables) {
    const migrations2 = [];
    const sameSql = lastTables.find((t) => t.sql === table.sql);
    if (sameSql) {
      actionedCurrentTables.push(sameSql.name);
      actionedLastTables.push(sameSql.name);
      continue;
    }
    const sameName = lastTables.find((t) => t.name === table.name);
    const sameColumns = lastTables.filter((t) => t.columnText === table.columnText);
    if (!sameName && sameColumns.length > 0) {
      const notCurrent = sameColumns.filter((t) => !actionedCurrentTables.includes(t.name) && !currentNames.includes(t.name));
      if (notCurrent.length > 0) {
        const oldName = notCurrent[0].name;
        const newName = table.name;
        actionedCurrentTables.push(newName);
        actionedLastTables.push(oldName);
        tableMigrations.push(`alter table ${oldName} rename to ${newName};`);
        continue;
      } else {
        actionedCurrentTables.push(table.name);
        migrations2.push(table.sql);
        continue;
      }
    }
    if (!sameName) {
      actionedCurrentTables.push(table.name);
      tableMigrations.push(table.sql);
      continue;
    }
    const currentColumns = table.columns.map((c) => c.name);
    const lastColumns = sameName.columns.map((c) => c.name);
    const actionedCurrentColumns = [];
    const actionedLastColumns = [];
    let recreate = false;
    const tableConstraints = table.constraints.sort((a, b) => a.localeCompare(b)).join(", ");
    const sameNameConstraints = sameName.constraints.sort((a, b) => a.localeCompare(b)).join(", ");
    if (tableConstraints !== sameNameConstraints) {
      recreate = true;
    }
    for (const column of sameName.columns) {
      const sameSql2 = table.columns.find((c) => c.sql === column.sql);
      if (sameSql2) {
        actionedCurrentColumns.push(sameSql2.name);
        actionedLastColumns.push(sameSql2.name);
        continue;
      }
      const sameName2 = table.columns.find((c) => c.name === column.name);
      const sameRest = table.columns.filter((c) => c.rest === column.rest);
      if (!sameName2 && sameRest.length > 0) {
        const notCurrent = sameRest.filter((c) => !actionedCurrentColumns.includes(c.name) && !lastColumns.includes(c.name));
        if (notCurrent.length > 0) {
          const oldName = column.name;
          const newName = notCurrent[0].name;
          actionedCurrentColumns.push(newName);
          actionedLastColumns.push(oldName);
          migrations2.push(`alter table ${table.name} rename column ${oldName} to ${newName};`);
          continue;
        } else {
          actionedLastColumns.push(column.name);
          migrations2.push(`alter table ${table.name} drop column ${column.name};`);
          continue;
        }
      }
      if (!sameName2) {
        actionedLastColumns.push(column.name);
        migrations2.push(`alter table ${table.name} drop column ${column.name};`);
        continue;
      }
      recreate = true;
      break;
    }
    if (actionedCurrentColumns.length !== currentColumns.length) {
      const columns = table.columns.map((c, i) => ({
        index: i,
        column: c,
        actioned: actionedCurrentColumns.includes(c.name)
      })).filter((c) => !c.actioned);
      const index2 = columns[0].index;
      if (index2 !== currentColumns.length - (currentColumns.length - actionedCurrentColumns.length)) {
        recreate = true;
      } else {
        for (const column of columns.map((c) => c.column)) {
          migrations2.push(`alter table ${table.name} add column ${column.sql};`);
        }
      }
    }
    actionedLastTables.push(table.name);
    if (!recreate) {
      columnMigrations.push(...migrations2);
    } else {
      const indexes = currentIndexes.filter((i) => i.table === table.name);
      let migration = "";
      const tempName = table.name + "_new";
      migration += table.sql.replace(/(^\s*create\s+table\s+)([a-zA-Z0-9_]+)(\s*\()/gmi, "$1$2_new$3");
      migration += "\n\n";
      const columns = sameName.columns.filter((c) => currentColumns.includes(c.name)).map((c) => `    ${c.name}`);
      migration += `insert into ${tempName} (
${columns.join(",\n")})
select
${columns.join(",\n")}
from ${table.name};

`;
      migration += `drop table ${table.name};
`;
      migration += `alter table ${tempName} rename to ${table.name};
`;
      for (const index2 of indexes) {
        migration += index2.sql;
        migration += "\n";
      }
      migration += `pragma foreign_key_check;
`;
      tableMigrations.push(migration);
    }
  }
  for (const table of lastTables) {
    if (!actionedLastTables.includes(table.name)) {
      tableMigrations.push(`drop table ${table.name};`);
    }
  }
  const migrations = [...tableMigrations, ...columnMigrations, ...indexMigrations, ...viewMigrations, ...virtualMigrations, ...triggerMigrations];
  if (migrations.length === 0) {
    console.log("No changes were detected.");
    process.exit();
  }
  const sql = migrations.join("\n").trim() + "\n";
  try {
    await (0, import_promises3.readFile)(outputPath, "utf8");
    console.log(`${outputPath} already exists.`);
  } catch {
    await (0, import_promises3.writeFile)(outputPath, sql, "utf8");
    await (0, import_promises3.writeFile)(lastTablesPath, currentSql, "utf8");
    await (0, import_promises3.writeFile)(lastViewsPath, currentViewsText, "utf8");
    console.log("Migration created.");
  }
};

// src/db.js
var import_path5 = require("path");
var process2 = (db, result, options) => {
  if (!options) {
    return result;
  }
  if (result.length === 0) {
    if (options.result === "object" || options.result === "value") {
      return void 0;
    }
    return result;
  }
  let mapper;
  if (options.result === "object" || options.result === "value") {
    mapper = mapOne;
  } else {
    mapper = mapMany;
  }
  if (options.result === "value" || options.result === "values") {
    if (options.parse) {
      const parsed = parse(result, options.types);
      const values2 = toValues(parsed);
      if (options.result === "value") {
        return values2[0];
      }
      return values2;
    }
    const values = toValues(result);
    if (options.result === "value") {
      return values[0];
    }
    return values;
  }
  if (options.parse && !options.map) {
    const parsed = parse(result, options.types);
    if (options.result === "object") {
      return parsed[0];
    }
    return parsed;
  }
  if (options.map) {
    return mapper(db, result, options.columns, options.types);
  }
  return result;
};
var dbTypes = {
  integer: true,
  int: true,
  real: true,
  text: true,
  blob: true,
  any: true
};
var typeMap2 = {
  integer: "Number",
  real: "Number",
  text: "String",
  blob: "Buffer",
  any: "Number | String | Buffer | null"
};
var validateCustomType = (customType) => {
  const error = `Error trying to register type '${customType.name}': `;
  if (!customType.name || !customType.tsType || !customType.dbType) {
    throw Error(error + "missing required fields.");
  }
  if (!/^[a-z0-9_]+$/gmi.test(customType.name)) {
    throw Error(error + `invalid name.`);
  }
  if (!dbTypes[customType.dbType]) {
    throw Error(error + `${customType.dbType} is not a valid database type.`);
  }
  if (customType.jsToDb && !customType.valueTest) {
    throw Error(error + "missing valueTest function.");
  }
  if (!customType.jsToDb && customType.valueTest) {
    throw Error(error + "missing jsToDb function.");
  }
};
var wait = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 100);
  });
};
var Database = class {
  constructor() {
    this.db;
    this.read = null;
    this.write = null;
    this.tables = {};
    this.columnSets = {};
    this.mappers = {};
    this.customTypes = {};
    this.columns = {};
    this.statements = /* @__PURE__ */ new Map();
    this.viewSet = /* @__PURE__ */ new Set();
    this.pool = [];
    this.poolSize = 100;
    this.dbPath = null;
    this.sqlPath = null;
    this.transactionCount = 0;
    this.extensions = null;
    this.databases = [];
    this.virtualSet = /* @__PURE__ */ new Set();
    this.prepared = [];
    this.registerTypes([
      {
        name: "boolean",
        valueTest: (v) => typeof v === "boolean",
        makeConstraint: (column) => `check (${column} in (0, 1))`,
        dbToJs: (v) => Boolean(v),
        jsToDb: (v) => v === true ? 1 : 0,
        tsType: "boolean",
        dbType: "integer"
      },
      {
        name: "date",
        valueTest: (v) => v instanceof Date,
        dbToJs: (v) => new Date(v),
        jsToDb: (v) => v.toISOString(),
        tsType: "Date",
        dbType: "text"
      },
      {
        name: "json",
        valueTest: (v) => Object.getPrototypeOf(v) === Object.prototype || Array.isArray(v),
        dbToJs: (v) => JSON.parse(v),
        jsToDb: (v) => JSON.stringify(v),
        tsType: "any",
        dbType: "text"
      }
    ]);
  }
  async initialize(paths) {
    const { db, sql, tables, views, types, migrations, extensions } = paths;
    this.dbPath = db;
    this.sqlPath = sql;
    this.extensions = extensions;
    this.read = await this.createDatabase();
    this.write = await this.createDatabase({ serialize: true });
    await this.setTables(tables);
    await this.setVirtual(tables);
    if (views) {
      await this.setViews(views);
    }
    const client = makeClient(this, sql);
    const makeTypes = async () => {
      await createTypes({
        db: this,
        sqlDir: sql,
        destinationPath: types
      });
    };
    const getTables3 = async () => {
      const sql2 = await (0, import_promises4.readFile)(tables, "utf8");
      return this.convertTables(sql2);
    };
    const createMigration = async (name) => {
      await migrate(this, tables, views, migrations, name);
    };
    const runMigration = async (name) => {
      const path = (0, import_path5.join)(migrations, `${name}.sql`);
      const sql2 = await (0, import_promises4.readFile)(path, "utf8");
      this.disableForeignKeys();
      try {
        await this.begin();
        await this.exec(sql2);
        await this.commit();
        console.log("Migration ran successfully.");
      } catch (e) {
        await this.rollback();
        throw e;
      }
      this.enableForeignKeys();
    };
    return {
      db: client,
      makeTypes,
      getTables: getTables3,
      createMigration,
      runMigration
    };
  }
  async createDatabase(options) {
    const serialize = options ? options.serialize : false;
    const db = new import_sqlite3.default.Database(this.dbPath);
    if (serialize) {
      db.serialize();
    }
    this.enableForeignKeys(db);
    if (this.extensions) {
      if (typeof this.extensions === "string") {
        await this.loadExtension(this.extensions, db);
      } else {
        for (const extension of this.extensions) {
          await this.loadExtension(extension, db);
        }
      }
    }
    this.databases.push(db);
    return db;
  }
  async enableForeignKeys(db) {
    await this.basicAll("pragma foreign_keys = on", db);
  }
  async disableForeignKeys(db) {
    await this.basicAll("pragma foreign_keys = off", db);
  }
  addTables(tables) {
    for (const table of tables) {
      this.tables[table.name] = table.columns;
      this.columnSets[table.name] = table.columnSet;
      this.columns[table.name] = {};
      for (const column of table.columns) {
        this.columns[table.name][column.name] = column.type;
      }
    }
  }
  async setTables(path) {
    const sql = await readSql(path);
    if (!sql.trim()) {
      return;
    }
    const tables = getTables(sql);
    this.addTables(tables);
  }
  async setViews(path) {
    let sql = await readSql(path);
    if (!sql.trim()) {
      return;
    }
    sql = sql.split(";").map((s) => preprocess(s.trim(), this.tables, true)).join(";\n\n").slice(0, -1);
    const views = getViews(sql, this);
    for (const view of views) {
      this.viewSet.add(view.name);
    }
    this.addTables(views);
  }
  async setVirtual(path) {
    const sql = await readSql(path);
    if (!sql.trim()) {
      return;
    }
    const tables = getVirtual(sql);
    this.addTables(tables);
    for (const table of tables) {
      this.virtualSet.add(table.name);
      this.columnSets[table.name].add(table.name);
    }
  }
  registerTypes(customTypes) {
    for (const customType of customTypes) {
      const { name, ...options } = customType;
      if (options.dbType && !options.tsType) {
        options.tsType = typeMap2[options.dbType];
      }
      if (name.includes(",")) {
        const names = name.split(",").map((n) => n.trim());
        for (const name2 of names) {
          validateCustomType({ name: name2, ...options });
          this.customTypes[name2] = options;
        }
      } else {
        validateCustomType({ name, ...options });
        this.customTypes[name] = options;
      }
    }
  }
  addStrict(sql) {
    const matches = blank(sql, { stringsOnly: true }).matchAll(/^\s*create table (?<tableName>[^\s]+)\s+\((?<columns>[^;]+?)(?<without>\s+without\s+rowid\s*)?(?<ending>;)/gmid);
    let lastIndex = 0;
    const fragments = [];
    for (const match of matches) {
      const [index2] = match.indices.groups.ending;
      const fragment2 = sql.substring(lastIndex, index2);
      fragments.push(fragment2);
      if (match.groups.without) {
        fragments.push(", strict");
      } else {
        fragments.push(" strict");
      }
      lastIndex = index2;
    }
    const fragment = sql.substring(lastIndex);
    fragments.push(fragment);
    return fragments.join("");
  }
  convertDefaults(sql) {
    let lastIndex = 0;
    let fragments = [];
    const blanked = blank(sql, { stringsOnly: true });
    const matches = blanked.matchAll(/\sdefault\s+(?<value>true|false|now\(\))(\s|,|$)/gmid);
    for (const match of matches) {
      const [start, end] = match.indices.groups.value;
      if (lastIndex !== start) {
        fragments.push(sql.substring(lastIndex, start));
      }
      lastIndex = end;
      const map = {
        "true": "1",
        "false": "0",
        "now()": `(date() || 'T' || time() || '.000Z')`
      };
      fragments.push(map[match.groups.value]);
    }
    fragments.push(sql.substring(lastIndex));
    return fragments.join("");
  }
  convertTables(sql) {
    sql = this.convertDefaults(sql);
    const fragments = getFragments(sql);
    let converted = "";
    for (const fragment of fragments) {
      if (!fragment.isColumn) {
        converted += fragment.sql;
        continue;
      }
      const customType = this.customTypes[fragment.type];
      if (!customType) {
        converted += fragment.sql;
        continue;
      }
      const match = /^\s*(?<name>[a-z0-9_]+)((\s+not\s+)|(\s+primary\s+)|(\s+references\s+)|(\s+check(\s+|\())|\s*$)/gmi.exec(fragment.sql);
      if (match) {
        fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+)(\s+|$)/gmi, `$1 ${customType.dbType}$2`);
      } else {
        fragment.sql = fragment.sql.replace(/(^\s*[a-z0-9_]+\s+)([a-z0-9_]+)((\s+)|$)/gmi, `$1${customType.dbType}$3`);
      }
      if (customType.makeConstraint) {
        const constraint = customType.makeConstraint(fragment.columnName);
        fragment.sql += " ";
        fragment.sql += constraint;
      }
      converted += fragment.sql;
    }
    return this.addStrict(converted);
  }
  convertToDb(value) {
    for (const customType of Object.values(this.customTypes)) {
      if (customType.valueTest(value)) {
        return customType.jsToDb(value);
      }
    }
    return value;
  }
  needsParsing(table, keys) {
    for (const key of keys) {
      if (key === "count") {
        continue;
      }
      const type = this.columns[table][key];
      if (!dbTypes[type]) {
        return true;
      }
    }
    return false;
  }
  getPrimaryKey(table) {
    const primaryKey = this.tables[table].find((c) => c.primaryKey);
    return primaryKey.name;
  }
  convertToJs(table, column, value) {
    if (value === null) {
      return value;
    }
    const type = this.columns[table][column];
    if (dbTypes[type]) {
      return value;
    }
    const customType = this.customTypes[type];
    if (customType.dbToJs) {
      return customType.dbToJs(value);
    }
    return value;
  }
  getJsToDbConverter(value) {
    for (const customType of Object.values(this.customTypes)) {
      if (customType.valueTest(value)) {
        return customType.jsToDb;
      }
    }
    return null;
  }
  getDbToJsConverter(type) {
    const customType = this.customTypes[type];
    if (customType) {
      return customType.dbToJs;
    }
    return null;
  }
  adjust(params) {
    const adjusted = {};
    for (let [key, value] of Object.entries(params)) {
      if (value === void 0) {
        value = null;
      }
      if (value === null || typeof value === "string" || typeof value === "number" || value instanceof Buffer) {
        adjusted[`$${key}`] = value;
      } else {
        for (const customType of Object.values(this.customTypes)) {
          if (customType.valueTest(value)) {
            value = customType.jsToDb(value);
            break;
          }
        }
        adjusted[`$${key}`] = value;
      }
    }
    return adjusted;
  }
  async getTransaction() {
    const db = this.pool.pop();
    if (!db) {
      if (this.databases.length < this.poolSize) {
        const db2 = await this.createDatabase({ serialize: true });
        const tx = { name: `tx${this.databases.length}`, db: db2 };
        const client = makeClient(this, this.sqlPath, tx);
        return client;
      }
      await wait();
      return this.getTransaction();
    }
    return db;
  }
  async begin(tx) {
    await this.basicRun("begin", tx);
  }
  async commit(tx) {
    await this.basicRun("commit", tx);
  }
  async rollback(tx) {
    await this.basicRun("rollback", tx);
  }
  release(tx) {
    this.pool.push(tx);
  }
  async loadExtension(path, db) {
    return new Promise((resolve, reject) => {
      db.loadExtension(path, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  async basicRun(sql, tx) {
    const db = tx ? tx.db : this.write;
    return new Promise((resolve, reject) => {
      db.run(sql, void 0, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  async basicAll(sql, tx) {
    const db = tx ? tx : this.write;
    return new Promise((resolve, reject) => {
      db.all(sql, void 0, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  async prepare(sql, db) {
    return new Promise((resolve, reject) => {
      const statement = db.prepare(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          this.prepared.push(statement);
          resolve(statement);
        }
      });
    });
  }
  async finalize(statement) {
    return new Promise((resolve) => {
      statement.finalize(() => resolve());
    });
  }
  async run(query, params, options, tx) {
    if (params === null) {
      params = void 0;
    }
    if (params !== void 0) {
      params = this.adjust(params);
    }
    const db = tx ? tx.db : this.write;
    if (typeof query === "string") {
      let key;
      if (options && options.cacheName) {
        key = options.cacheName;
      } else {
        key = query;
      }
      const statementKey = tx ? tx.name : "write";
      const statements = this.statements[statementKey];
      const cached = statements ? this.statements.get(key) : void 0;
      if (cached) {
        query = cached;
      } else {
        if (!statements) {
          this.statements[statementKey] = /* @__PURE__ */ new Map();
        }
        const statement = await this.prepare(query, db);
        this.statements[statementKey].set(key, statement);
        query = statement;
      }
    }
    return new Promise((resolve, reject) => {
      query.run(params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
  async all(query, params, options, tx, write) {
    if (params === null) {
      params = void 0;
    }
    if (params !== void 0) {
      params = this.adjust(params);
    }
    const client = tx ? tx.db : write ? this.write : this.read;
    if (typeof query === "string") {
      let key;
      if (options && options.cacheName) {
        key = options.cacheName;
      } else {
        key = query;
      }
      const statementKey = tx ? tx.name : write ? "write" : "read";
      const statements = this.statements[statementKey];
      const cached = statements ? this.statements.get(key) : void 0;
      if (cached) {
        query = cached;
      } else {
        if (!statements) {
          this.statements[statementKey] = /* @__PURE__ */ new Map();
        }
        const statement = await this.prepare(query, client);
        this.statements[statementKey].set(key, statement);
        query = statement;
      }
    }
    const db = this;
    return new Promise((resolve, reject) => {
      query.all(params, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          const result = process2(db, rows, options);
          resolve(result);
        }
      });
    });
  }
  async exec(sql) {
    return new Promise((resolve, reject) => {
      this.write.exec(sql, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  async close() {
    const makePromise = (db) => {
      return new Promise((resolve, reject) => {
        db.close(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    };
    const finalizePromises = this.prepared.map((statement) => this.finalize(statement));
    await Promise.all(finalizePromises);
    const promises = this.databases.map((db) => makePromise(db));
    await Promise.all(promises);
  }
};
var db_default = Database;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Database,
  gt,
  gte,
  lt,
  lte,
  not
});
