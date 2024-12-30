const index = `interface QueryOptions {
  parse: boolean;
}

interface DatabaseConfig {
  debug?: boolean;
}

interface SQLiteConfig extends DatabaseConfig {
  db: string | URL;
  sql: string | URL;
  tables: string | URL;
  views: string | URL;
  extensions?: string | URL | Array<string | URL>;
  adaptor: any;
}

interface TursoConfig extends DatabaseConfig {
  db: any;
  files: any;
}

interface D1Config extends DatabaseConfig {
  db: any;
  files: any;
}

interface FileSystem {
  readFile: (path: string, encoding: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  join: (...paths: string[]) => string;
  readSql: (path: string) => Promise<string>;
}

interface Paths {
  tables: string;
  views: string;
  sql: string;
  types: string;
  migrations: string;
  wrangler?: string;
  files?: string;
}

declare class Database {
  constructor(options: DatabaseOptions);
  runMigration(sql: string): Promise<void>;
  makeTypes(fileSystem: FileSystem, paths: Paths): Promise<void>;
  getClient<T>(): T; 
  getTables(): Promise<string>;
  createMigration(fileSystem: FileSystem, paths: Paths, name: string, reset?: boolean): Promise<string>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
}

declare class SQLiteDatabase extends Database {
  constructor(options: SQLiteConfig);
  close(): Promise<void>;
}

declare class TursoDatabase extends Database {
  constructor(options: TursoConfig);
  batch(handler: (batcher: any) => any[]): Promise<any[]>;
}

declare class D1Database extends Database {
  constructor(options: D1Config);
  batch(handler: (batcher: any) => any[]): Promise<any[]>;
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
declare function like(value: any): Modifier | undefined;
declare function match(value: any): Modifier | undefined;
declare function glob(value: any): Modifier | undefined;

type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
};

export {
  Database,
  SQLiteDatabase,
  TursoDatabase,
  D1Database,
  not,
  gt,
  gte,
  lt,
  lte,
  like,
  match,
  glob
}
`;

const interfaces = `export interface Keywords {
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

export interface VirtualKeywords<T> {
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

export interface VirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get(params?: W | null, columns: null, keywords?: VirtualKeywords): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K, keywords?: VirtualKeywords<T>): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, column: K[], keywords?: VirtualKeywords<T>): Promise<Pick<T, K> | undefined>;
  get(params: W | null, columns: null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, columns: null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W): Promise<Array<T>>;
  many(params?: W, columns: null, keywords?: VirtualKeywords): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: K[], keywords?: VirtualKeywords): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K, keywords?: VirtualKeywords): Promise<Array<T[K]>>;
  many(params: W | null, columns: null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  many(params: W | null, columns: null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface Queries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get(params?: W | null, columns: null, keywords: Keywords): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, columns: K[], keywords?: Keywords): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, column: K, keywords?: Keywords): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, columns: null, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | undefined>;
  many(params?: W): Promise<Array<T>>;
  many(params?: W, columns: null, keywords: Keywords): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: K[], keywords?: Keywords): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K, keywords?: Keywords): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, columns: null, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  count(params: W | null, keywords?: { distinct: true }): Promise<number>;
  exists(params: W | null): Promise<boolean>;
  remove(params?: W): Promise<number>;
}
`;

const files = {
  index,
  interfaces
};

export default files;
