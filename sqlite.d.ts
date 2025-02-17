type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
};

interface TypedDb {
  [key: string]: any,
  exec(sql: string): Promise<void>,
  begin(): Promise<void>,
  commit(): Promise<void>,
  rollback(): Promise<void>,
  pragma(sql: string): Promise<any[]>,
  deferForeignKeys(): Promise<void>,
  getTransaction(): Promise<TypedDb>,
  batch:<T extends any[]> (batcher: (bx: TypedDb) => T) => Promise<Unwrap<T>>
}

declare const database: any;
declare const db: TypedDb;

export {
  database,
  db
}
