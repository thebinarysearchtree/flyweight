interface QueryOptions {
  parse: boolean;
}

interface DatabaseOptions {
  db: string | URL;
  sql?: string | URL;
  tables: string | URL;
  views?: string | URL;
  types?: string | URL;
  migrations?: string | URL;
  extensions?: string | URL | Array<string | URL>;
  debug?: boolean;
}

declare class Database {
  constructor(options?: DatabaseOptions);
  makeTypes(): Promise<void>;
  getClient<T>(): T; 
  getTables(): Promise<string>;
  createMigration(name: string): Promise<string>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
}

declare class SQLiteDatabase extends Database {
  runMigration(name: string): Promise<void>;
  close(): Promise<void>;
}

declare class D1Database extends Database {
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
