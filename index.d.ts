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
  setTables(path?: string): Promise<void>;
  registerParsers(parsers: Array<Parser>): void;
  registerMappers(table: string, mappers: Array<Mapper>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  prepare(sql: string): Statement;
  run(query: string | Statement, params?: any): Promise<number>;
  get<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<T | null>;
  all<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<Array<T>>;
}

export interface Keywords<T> {
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

export interface KeywordsWithCount {
  distinct?: boolean;
  count: true;
}

export type RequiredParams<T> = Partial<Record<keyof T, any>>;

export type Params<T> = null | Partial<Record<keyof T, any>>;

export interface BasicQueries<T> {
  insert(params: T): Promise<any>;
  insertMany(params: Array<T>): Promise<void>;
  update(params: RequiredParams<T>, query?: Params<T>): Promise<number>;
  get(params?: Params<T>): Promise<T | null>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<T[K] | null>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<T | null>;
  get(params: Params<T>, keywords: KeywordsWithCount): Promise<number>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<T[K] | null>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | null>;
  all(params?: any): Promise<Array<T>>;
  all<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Array<Pick<T, K>>>;
  all<K extends keyof T>(params: Params<T>, column: K): Promise<Array<T[K]>>;
  all(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  all<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<Array<T[K]>>;
  all<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  all<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  remove(params?: Params<T>): Promise<number>;
}

export interface TypeOptions {
  db?: Database;
  createTablePath?: string;
  sqlDir?: string;
  interfaceName: string;
  destinationPath: string;
}

export function makeClient(database: Database, sqlDir?: string): { [key: string]: BasicQueries<any> };
export function createTypes(options: TypeOptions): Promise<void>;
