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

export interface Keywords<T> {
  select: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
  count?: boolean;
}

type Select = Array<string> | string | undefined;

interface BasicQueries<T> {
  insert(params: any): Promise<any>;
  insertMany(params: Array<any>): Promise<void>;
  update(params: any, query?: any): Promise<number>;
  get(params?: any): Promise<T | null>;
  get<K extends keyof T>(params: any, columns: K[]): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: any, column: K): Promise<T[K] | null>;
  get(params: any, keywords: Keywords<Select>): Promise<T | null>;
  get<K extends keyof T>(params: any, keywords: Keywords<K>): Promise<T[K] | null>;
  get<K extends keyof T>(params: any, keywords: Keywords<K[]>): Promise<Pick<T, K> | null>;
  all(params?: any): Promise<Array<T>>;
  all<K extends keyof T>(params: any, columns: K[]): Promise<Array<Pick<T, K>>>;
  all<K extends keyof T>(params: any, column: K): Promise<Array<T[K]>>;
  all(params: any, keywords: Keywords<Select>): Promise<Array<T>>;
  all<K extends keyof T>(params: any, keywords: Keywords<K>): Promise<Array<T[K]>>;
  all<K extends keyof T>(params: any, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  remove(params?: any): Promise<number>;
}

export function registerMappers(table: string, mappers: Array<Mapper>): void;
export function makeClient(database: Database, sqlDir?: string): { [key: string]: BasicQueries<any> };
