interface QueryOptions {
  parse: boolean;
}

interface DatabaseOptions {
  debug?: boolean;
}

interface SQLiteOptions extends DatabaseOptions {
  db: string | URL;
  sql: string | URL;
  tables: string | URL;
  views: string | URL;
  types: string | URL;
  migrations: string | URL;
  extensions?: string | URL | Array<string | URL>;
  adaptor: any;
}

interface D1Config extends DatabaseOptions {
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
}

declare class Database {
  constructor(options: DatabaseOptions);
  makeTypes(fileSystem: FileSystem, paths: Paths): Promise<void>;
  getClient<T>(): T; 
  getTables(): Promise<string>;
  createMigration(fileSystem: FileSystem, paths: Paths, name: string): Promise<string>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
}

declare class SQLiteDatabase extends Database {
  constructor(options: SQLiteOptions);
  runMigration(name: string): Promise<void>;
  close(): Promise<void>;
}

declare class D1Database extends Database {
  constructor(options: D1Config);
  runMigration(sql: string): Promise<void>;
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

export {
  Database,
  SQLiteDatabase,
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
