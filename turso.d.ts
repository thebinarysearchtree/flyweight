type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
}

interface TypedDb {
  [key: string]: any;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getTransaction(type: ('read' | 'write' | 'deferred')): Promise<TypedDb>;
  batch:<T extends any[]> (batcher: (bx: TypedDb) => T) => Promise<Unwrap<T>>;
  sync(): Promise<void>;
  view(expression: (tables: Tables, compare: CompareMethods<Date | number | boolean | null>, create: ComputeMethods) => any): Promise<void>;
}

export const database: TursoDatabase;
export const db: TypedDb;
