import { Statement } from "sqlite3";

export interface QueryOptions {
  map?: boolean;
  parse?: boolean;
  skip?: Array<string>;
  prefixes: Array<string> | { [key: string]: string };
}

export interface Mapper extends QueryOptions {
  query: string;
}

export interface Parser {
  pattern?: RegExp;
  dbPattern?: RegExp;
  jsPattern?: RegExp;
  dbToJs?: (value: any) => any;
  jsToDb?: (value: any) => any;
  trim?: string;
  valueTest: (value: any) => boolean;
}

export class Database {
  constructor(path: string);
  enforceForeignKeys(): Promise<void>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  prepare(sql: string): Statement;
  run(query: string | Statement, params?: any): Promise<number>;
  get<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<T | null>;
  all<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<Array<T>>;
}

export function registerParser(parser: Parser): void;

export interface Keywords {
  select?: Array<string> | string;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
  count?: boolean;
}

interface BasicQueries {
  insert(params: any): Promise<any>;
  insertMany(params: Array<any>): Promise<void>;
  update(params: any, query?: any): Promise<number>;
  get<T>(params?: any): Promise<T | null>;
  get<T>(params: any, columns: Array<string>): Promise<T | null>;
  get<T>(params: any, keywords: Keywords): Promise<T | null>;
  all<T>(params?: any): Promise<Array<T>>;
  all<T>(params: any, columns: Array<string>): Promise<Array<T>>;
  all<T>(params: any, keywords: Keywords): Promise<Array<T>>;
  remove(params?: any): Promise<number>;
}

export function makeClientFromArray(database: Database, tables: Array<string>): { [key in tables]: BasicQueries };
export function makeClientFromFolder(database: Database, sqlFolder: string): any;
export function registerMappers(table: string, mappers: Array<Mapper>): void;
