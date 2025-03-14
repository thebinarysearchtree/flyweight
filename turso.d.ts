type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
};

interface TypedDb {
  [key: string]: any;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getTransaction(type: ('read' | 'write' | 'deferred')): Promise<TypedDb>;
  batch:<T extends any[]> (batcher: (bx: TypedDb) => T) => Promise<Unwrap<T>>;
  sync(): Promise<void>;
}

interface Config {
    url: string;
    authToken?: string;
    encryptionKey?: string;
    syncUrl?: string;
    syncInterval?: number;
    tls?: boolean;
    intMode?: 'number' | 'bigint' | 'string';
    fetch?: Function;
    concurrency?: number | undefined;
}

declare function makeClient(options: Config, internal?: boolean): TypedDb;

export default makeClient;
