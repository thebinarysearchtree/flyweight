interface TursoDatabase {
  name: string;
}

type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
}

type SymbolObject = { [key: symbol]: symbol };

interface SubqueryReturn {
  select: { [key: string | symbol]: symbol };
  join?: SymbolObject;
  leftJoin?: SymbolObject;
  where?: { [key: symbol]: symbol | null | number | boolean | Date };
  groupBy?: symbol | symbol[];
  having?: SymbolObject;
  orderBy?: symbol | symbol[];
  offset?: number;
  limit?: number;
  as: string;
}

type SubqueryContext = Tables & CompareMethods<Date | number | boolean | null | symbol> & ComputeMethods & SymbolMethods;

interface TypedDb {
  [key: string]: any;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getTransaction(type: ('read' | 'write' | 'deferred')): Promise<TypedDb>;
  batch:<T extends any[]> (batcher: (bx: TypedDb) => T) => Promise<Unwrap<T>>;
  sync(): Promise<void>;
  subquery(expression: (context: SubqueryContext) => SubqueryReturn): Promise<void>;
}

export const database: TursoDatabase;
export const db: TypedDb;
