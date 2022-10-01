export interface Keywords<T> {
  select: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithExclude<T> {
  exclude: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithoutSelect {
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithCount {
  distinct?: boolean;
  count: true;
}

export type RequiredParams<T> = Partial<Record<keyof T, any>>;

export type Params<T> = null | Partial<Record<keyof T, any>>;

export interface SingularQueries<T> {
  insert(params: T): Promise<any>;
  update(query: Params<T> | null, params: RequiredParams<T>): Promise<number>;
  get(params?: Params<T>): Promise<T | null>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<T[K] | null>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<T | null>;
  get(params: Params<T>, keywords: KeywordsWithCount): Promise<number>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<T[K] | null>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | null>;
  remove(params?: Params<T>): Promise<number>;
}

export interface MultipleQueries<T> {
  insert(params: Array<T>): Promise<void>;
  update(query: Params<T> | null, params: RequiredParams<T>): Promise<number>;
  get(params?: any): Promise<Array<T>>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<Array<T[K]>>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  remove(params?: Params<T>): Promise<number>;
}