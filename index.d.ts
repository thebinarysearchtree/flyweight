import { Statement } from 'sqlite3';

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

export interface Paths {
  db: string;
  sql?: string;
  tables: string;
  types?: string;
  extensions?: string | Array<string>;
}

export interface Initialize<T> {
  db: T;
  makeTypes(): Promise<void>;
  getTables(): Promise<string>;
}

export class Database {
  constructor();
  initialize<T>(paths: Paths, interfaceName?: string): Promise<Initialize<T>>;
  registerTypes(customTypes: Array<CustomType>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  prepare(sql: string): Statement;
  run(query: string | Statement, params?: any): Promise<number>;
  get<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<T | null>;
  all<T>(query: string | Statement, params?: any, options?: QueryOptions): Promise<Array<T>>;
}
