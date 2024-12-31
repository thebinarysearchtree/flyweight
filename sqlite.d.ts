interface TypedDb {
  [key: string]: any,
  begin(): Promise<void>,
  commit(): Promise<void>,
  rollback(): Promise<void>,
  getTransaction(): Promise<TypedDb>,
  release(transaction: TypedDb): void
}

declare const database: SQLiteDatabase;
declare const db: TypedDb;

export {
  database,
  db
}
