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
  createMigration(name: string): Promise<void>;
  runMigration(name: string): Promise<void>;
}

declare class Database {
  constructor();
  initialize<T>(paths: Paths, interfaceName?: string): Promise<Initialize<T>>;
  registerTypes(customTypes: Array<CustomType>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(query: any, params?: any): Promise<number>;
  all<T>(query: any, params?: any, options?: QueryOptions): Promise<Array<T>>;
  exec(query: string): Promise<void>;
  close(): Promise<void>;
}

declare class Modifier {
  constructor(name: string, value: any, operator: string);
  name: string;
  value: any;
  operator: string
}

function not(value: any): Modifier;
function gt(value: any): Modifier;
function gte(value: any): Modifier;
function lt(value: any): Modifier;
function lte(value: any): Modifier;

export {
  Database,
  not,
  gt,
  gte,
  lt,
  lte
}
