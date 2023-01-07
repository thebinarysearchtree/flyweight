import { Statement } from 'sqlite3';

export interface QueryOptions {
  parse: boolean;
}

export interface CustomType {
  name: string;
  valueTest?: (v: any) => boolean;
  makeConstraint?: (column: string) => string;
  dbToJs?: (v: any) => any;
  jsToDb?: (v: any) => any;
  tsType: string;
  dbType: string;
}

export interface Paths {
  db: string | URL;
  sql?: string | URL;
  tables: string | URL;
  views?: string | URL;
  types?: string | URL;
  migrations?: string | URL;
  extensions?: string | URL | Array<string | URL>;
}

export interface Initialize<T> {
  db: T;
  makeTypes(): Promise<void>;
  getTables(): Promise<string>;
  createMigration(name: string): Promise<void>;
  runMigration(name: string): Promise<void>;
}

export class Database {
  constructor();
  initialize<T>(paths: Paths, interfaceName?: string): Promise<Initialize<T>>;
  registerTypes(customTypes: Array<CustomType>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(query: string | Statement, params?: any): Promise<number>;
  all<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<Array<T>>;
  exec(query: string): Promise<void>;
  close(): Promise<void>;
}
