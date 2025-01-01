interface TypedDb {
  [key: string]: any,
  begin(): Promise<void>,
  commit(): Promise<void>,
  rollback(): Promise<void>,
  getTransaction(): Promise<TypedDb>,
  release(transaction: TypedDb): void
}

declare const database: any;
declare const db: TypedDb;

export {
  database,
  db
}
