interface QueryOptions {
  parse: boolean;
}

interface DatabaseConfig {
  debug?: boolean;
}

interface SQLiteConfig extends DatabaseConfig {
  db: string | URL;
  paths: SQLitePaths;
  adaptor: any;
}

interface TursoConfig extends DatabaseConfig {
  db: any;
  paths: Paths;
  adaptor: any;
}

interface FileSystem {
  readFile: (path: string, encoding: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  join: (...paths: string[]) => string;
  readSql: (path: string) => Promise<string>;
}

interface Paths {
  tables: string | URL;
  views: string | URL;
  sql: string | URL;
  types: string | URL;
  migrations: string | URL;
  computed: string | URL;
}

interface SQLitePaths extends Paths {
  db: string | URL;
  extensions?: string | URL | Array<string | URL>;
}

export class Database {
  constructor(options: DatabaseConfig);
  runMigration(sql: string): Promise<void>;
  makeTypes(fileSystem: FileSystem, paths: Paths, sampleData?: boolean): Promise<void>;
  getClient(): any;
  getTables(): Promise<string>;
  createMigration(fileSystem: FileSystem, paths: Paths, name: string, reset?: boolean): Promise<string>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
  close(): Promise<void>;
}

export class SQLiteDatabase extends Database {
  constructor(options: SQLiteConfig);
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class TursoDatabase extends Database {
  constructor(options: TursoConfig);
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  batch(handler: (batcher: any) => any[]): Promise<any[]>;
}
