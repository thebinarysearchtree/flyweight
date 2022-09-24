import { Statement } from "sqlite3";

export interface QueryOptions {
  parse: boolean;
}

export interface CustomType {
  name: string;
  valueTest: (v: any) => boolean;
  makeConstraint?: (column: string) => string;
  dbToJs: (v: any) => any;
  jsToDb: (v: any) => any;
  tsType: string;
  dbType: string;
}

export class Database {
  constructor(path: string);
  enforceForeignKeys(): Promise<void>;
  setTables(path: string): Promise<void>;
  registerTypes(customTypes: Array<CustomType>): void;
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

export interface SingularQueries<T> {
  insert(params: T): Promise<any>;
  update(query: Params<T> | null, params: RequiredParams<T>): Promise<number>;
  get(params?: Params<T>): Promise<T | undefined>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<T[K] | undefined>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<T | undefined>;
  get(params: Params<T>, keywords: KeywordsWithCount): Promise<number>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | undefined>;
  remove(params?: Params<T>): Promise<number>;
}

export interface MultipleQueries<T> {
  insert(params: Array<T>): Promise<void>;
  update(query: Params<T> | null, params: RequiredParams<T>): Promise<number>;
  get(params?: any): Promise<Array<T>>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<Array<T[K]>>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  remove(params?: Params<T>): Promise<number>;
}

export interface TypeOptions {
  createTablePath: string;
  sqlDir?: string;
  interfaceName: string;
  destinationPath: string;
}

export function makeClient(database: Database, sqlDir?: string): { [key: string]: BasicQueries<any> };
export function createTypes(options: TypeOptions): Promise<void>;
