interface QueryOptions {
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
  createMigration(name: string): Promise<{ sql: string, undo: () => Promise<void>}>;
  runMigration(name: string): Promise<void>;
}

declare class Database {
  constructor(options?: { debug?: boolean });
  initialize<T>(paths: Paths): Promise<Initialize<T>>;
  registerTypes(customTypes: Array<CustomType>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
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



interface Keywords<T> {
  select: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface KeywordsWithExclude<T> {
  exclude: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface KeywordsWithoutSelect {
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface VirtualKeywordsSelect<T, K> {
  select: K;
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  limit?: number;
  offset?: number;
}

interface VirtualKeywordsHighlight<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  highlight: { column: keyof T, tags: [string, string] };
  limit?: number;
  offset?: number;
}

interface VirtualKeywordsSnippet<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  snippet: { column: keyof T, tags: [string, string], trailing: string, tokens: number };
  limit?: number;
  offset?: number;
}

interface SingularVirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Pick<T, K> | undefined>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
}

interface MultipleVirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Array<Pick<T, K>>>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

interface SingularQueries<T, I, W, R> {
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

interface MultipleQueries<T, I, W> {
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
}

interface User {
  id: number;
  name: string;
}

interface InsertUser {
  id?: number;
  name: string;
}

interface WhereUser {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
}

interface TypedDb {
  [key: string]: any,
  users: MultipleQueries<User, InsertUser, WhereUser>,
  user: SingularQueries<User, InsertUser, WhereUser, number>,
  begin(): Promise<void>,
  commit(): Promise<void>,
  rollback(): Promise<void>,
  getTransaction(): Promise<TypedDb>,
  release(transaction: TypedDb): void
}

declare const database: Database;
declare const db: TypedDb;
declare function makeTypes(): Promise<void>;
declare function getTables(): Promise<string>;
declare function createMigration(name: string): Promise<{ sql: string, undo: () => Promise<void>}>;
declare function runMigration(name: string): Promise<void>;
declare const sqlPath: string;

export {
  database,
  db,
  makeTypes,
  getTables,
  createMigration,
  runMigration,
  sqlPath
}
