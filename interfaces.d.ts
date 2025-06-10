type ExtractKeys<U> = U extends Record<string, any> ? keyof U : keyof {};

export interface Keywords<T> {
  orderBy?: T;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface Includes<T, R> {
  [key: string]: (tables: T, columns: R) => any;
}

type ObjectFunction = {
  [key: string]: (...args: any) => any;
}

type MergeIncludes<T, U extends ObjectFunction> = 
  T & { [K in keyof U]: ReturnType<U[K]> extends Promise<infer R> ? R : never;
};

type ReturnTypes<T extends ObjectFunction> = {
  [K in keyof T]: ReturnType<T[K]>;
};

type ConvertAlias<T, U extends ObjectFunction> = 
  T & { [K in keyof U]: ReturnType<U[K]> extends Promise<infer R> ? R : never;
};

type IncludeWhere<U extends ObjectFunction> = {
  [K in keyof U]: ReturnType<U[K]> extends Promise<infer R>
    ? R extends string | number | Date | boolean ? R | Array<R> | WhereFunction<R> | null : never : never;
}

export interface VirtualKeywords<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  limit?: number;
  offset?: number;
}

export interface Highlight<T> extends VirtualKeywords<T> {
  highlight: { column: keyof T, tags: [string, string] };
}

export interface Snippet<T> extends VirtualKeywords<T> {
  snippet: { column: keyof T, tags: [string, string], trailing: string, tokens: number };
}

export interface HighlightQuery<W, T> extends Highlight<T> {
  where?: W;
}

export interface SnippetQuery<W, T> extends Snippet<T> {
  where?: W;
}

export interface VirtualQuery<W, T> extends VirtualKeywords<T> {
  where?: W;
}

export interface VirtualQueryObject<W, K, T> extends VirtualQuery<W, T> {
  select: (keyof T)[] | K[];
}

export interface VirtualQueryValue<W, K, T> extends VirtualQuery<W, T> {
  select: K;
}

export interface AggregateQuery<W, K> {
  where?: W;
  column?: K;
  distinct?: K;
}

export interface AggregateQueryDebug<W, K> extends AggregateQuery<W, K> {
  debug: true;
}

export interface GroupQueryObjectDebug<T, W, K, U> extends GroupQueryObject<T, W, K, U> {
  debug: true;
}

export interface GroupQueryObjectAliasDebug<T, W, K, U, A> extends GroupQueryObjectAlias<T, W, K, U, A> {
  debug: true;
}

export interface ComplexQueryInclude<W, T, U extends ObjectFunction, C> extends Keywords<Array<keyof (T & C)> | keyof (T & C)> {
  where?: W;
  select?: undefined;
  include?: U;
}

export interface ComplexSqlQueryIncludeParamsUnsafe<P, U, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryIncludeParams<P, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryIncludeUnsafe<U, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryInclude<W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryIncludeParamsUnsafeDebug<P, U, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeParamsUnsafe<P, U, W, T, R> {
  debug: true;
}

export interface ComplexSqlQueryIncludeParamsDebug<P, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeParams<P, W, T, R> {
  debug: true;
}

export interface ComplexSqlQueryIncludeUnsafeDebug<U, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeUnsafe<U, W, T, R> {
  debug: true;
}

export interface ComplexSqlQueryIncludeDebug<W, T, R extends ObjectFunction> extends ComplexSqlQueryInclude<W, T, R> {
  debug: true;
}

export interface ComplexQueryIncludeDebug<W, T, U extends ObjectFunction, C> extends ComplexQueryInclude<W, T, U, C> {
  debug: true;
}

export interface ComplexQueryObjectInclude<W, K, T, U extends ObjectFunction, C> extends Keywords<keyof (T & C) | Array<keyof (T & C)>> {
  where?: W;
  select: (keyof (T & C))[] | K[];
  include?: U;
}

export interface ComplexSqlQueryObjectIncludeParamsUnsafe<P, U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeUnsafe<U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectInclude<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeParamsUnsafeDebug<P, U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParamsUnsafe<P, U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParams<P, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeUnsafeDebug<U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeUnsafe<U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeDebug<W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectInclude<W, K, T, R> {
  debug: true;
}

export interface ComplexQueryObjectIncludeDebug<W, K, T, U extends ObjectFunction, C> extends ComplexQueryObjectInclude<W, K, T, U, C> {
  debug: true;
}

export interface ComplexQueryObjectIncludeOmit<W, K, T, U extends ObjectFunction, C> extends Keywords<keyof (T & C) | Array<keyof (T & C)>> {
  where?: W;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include?: U;
}

export interface ComplexSqlQueryObjectIncludeOmitParamsUnsafe<P, U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeOmitUnsafe<U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeOmit<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeOmitParamsUnsafeDebug<P, U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParamsUnsafe<P, U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeOmitParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeOmitUnsafeDebug<U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitUnsafe<U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeOmitDebug<W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmit<W, K, T, R> {
  debug: true;
}

export interface ComplexQueryObjectIncludeOmitDebug<W, K, T, U extends ObjectFunction, C> extends ComplexQueryObjectIncludeOmit<W, K, T, U, C> {
  debug: true;
}

export interface ComplexQueryValue<W, K, T, C> extends Keywords<Array<keyof (T & C)> | keyof (T & C)> {
  where?: W;
  select: K;
  omit?: undefined;
  include?: undefined;
}

export interface ComplexSqlQueryValueParamsUnsafe<P, U, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryValueParams<P, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryValueUnsafe<U, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryValue<W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryValueParamsUnsafeDebug<P, U, W, K, T> extends ComplexSqlQueryValueParamsUnsafe<P, U, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryValueParamsDebug<P, W, K, T> extends ComplexSqlQueryValueParams<P, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryValueUnsafeDebug<U, W, K, T> extends ComplexSqlQueryValueUnsafe<U, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryValueDebug<W, K, T> extends ComplexSqlQueryValue<W, K, T> {
  debug: true;
}

export interface ComplexQueryValueDebug<W, K, T, C> extends ComplexQueryValue<W, K, T, C> {
  debug: true;
}

type MakeOptionalNullable<T> = {
  [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K];
};

export interface UpdateQuery<W, T> {
  where?: W | null;
  set: Partial<MakeOptionalNullable<T>>;
}

export interface UpsertQuery<T, K> {
  values: T;
  target?: K;
  set?: Partial<MakeOptionalNullable<T>>;
}

export interface DebugQuery {
  sql: string;
  params?: any;
}

export interface DebugResult<R> {
  result: R;
  queries: Array<DebugQuery>;
}

export interface GroupQueryObject<T, W, K, U> {
  where?: W;
  column?: keyof T;
  distinct?: keyof T;
  orderBy?: K;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include?: U;
  alias?: undefined;
}

export interface GroupQueryObjectAlias<T, W, K, U, A> {
  where?: W;
  column?: keyof T;
  distinct?: keyof T;
  orderBy?: K;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include?: U;
  alias: A;
}

export interface GroupArrayKeywords<T, W, K, U> {
  where?: W;
  column?: keyof T;
  distinct?: keyof T;
  orderBy?: K;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include?: U;
}

export interface GroupArray<T, W, K, U> extends GroupArrayKeywords<T, W, K, U> {
  select?: undefined;
  alias?: undefined;
}

export interface GroupArrayAlias<T, W, K, U, A> extends GroupArrayKeywords<T, W, K, U> {
  select?: undefined;
  alias: A;
}

export interface GroupArraySelect<T, W, K, U, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S[];
  alias?: undefined;
}

export interface GroupArraySelectAlias<T, W, K, U, A, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S[];
  alias: A;
}

export interface GroupArrayValue<T, W, K, U, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S;
  alias?: undefined;
}

export interface GroupArrayValueAlias<T, W, K, U, A, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S;
  alias: A;
}

export interface AggregateMethods<T, W, C, K extends keyof (T & C), Y> {
  count<U extends Includes<Y, (Pick<(T & C), K> & { count: number })>>(params?: GroupQueryObject<T, W & ToWhere<{ count: number }>, K | 'count', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { count: number }, U>>>;
  count<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { count: number })>>(params?: GroupQueryObjectAlias<T, W & ToWhere<{ count: number }>, K | 'count', U, A>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, number>, U>>>;
  avg<U extends Includes<Y, (Pick<(T & C), K> & { avg: number })>>(params: GroupQueryObject<T, W & ToWhere<{ avg: number }>, K | 'avg', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { avg: number }, U>>>;
  avg<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { avg: number })>>(params: GroupQueryObjectAlias<T, W & ToWhere<{ avg: number }>, K | 'avg', U, A>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, number>, U>>>;
  max<U extends Includes<Y, (Pick<(T & C), K> & { min: number })>>(params: GroupQueryObject<T, W & ToWhere<{ max: number }>, K | 'max', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { max: number }, U>>>;
  max<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { min: number })>>(params: GroupQueryObjectAlias<T, W & ToWhere<{ max: number }>, K | 'max', U, A>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, number>, U>>>;
  min<U extends Includes<Y, (Pick<(T & C), K> & { max: number })>>(params: GroupQueryObject<T, W & ToWhere<{ min: number }>, K | 'min', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { min: number }, U>>>;
  min<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { max: number })>>(params: GroupQueryObjectAlias<T, W & ToWhere<{ min: number }>, K | 'min', U, A>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, number>, U>>>;
  sum<U extends Includes<Y, (Pick<(T & C), K> & { sum: number })>>(params: GroupQueryObject<T, W & ToWhere<{ sum: number }>, K | 'sum', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { sum: number }, U>>>;
  sum<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { sum: number })>>(params: GroupQueryObjectAlias<T, W & ToWhere<{ sum: number }>, K | 'sum', U, A>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, number>, U>>>;
  array<S extends keyof (T & C), U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArrayValue<T, W & ToWhere<{ sum: number }>, K | 'items', U, S>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { items: Array<(T & C)[S]> }, U>>>;
  array<A extends string, S extends keyof (T & C), U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArrayValueAlias<T, W & ToWhere<{ sum: number }>, K | 'items', U, A, S>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, Array<(T & C)[S]>>, U>>>;
  array<U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArray<T, W & ToWhere<{ sum: number }>, K | 'items', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { items: Array<T> }, U>>>;
  array<A extends string, U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArrayAlias<T, W & ToWhere<{ sum: number }>, K | 'items', U, A>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, Array<T>>, U>>>;
  array<S extends keyof (T & C), U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArraySelect<T, W & ToWhere<{ sum: number }>, K | 'items', U, S>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { items: Array<Pick<(T & C), S>> }, U>>>;
  array<A extends string, S extends keyof (T & C), U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArraySelectAlias<T, W & ToWhere<{ sum: number }>, K | 'items', U, A, S>): Promise<Array<MergeIncludes<Pick<(T & C), K> & Record<A, Array<Pick<(T & C), S>>>, U>>>;
}

export interface ComputeMethods {
  abs: (n: number) => void;
  coalesce: (a: any, b: any, ...rest: any[]) => void;
  concat: (...args: any[]) => void;
  concatWs: (...args: any[]) => void;
  format: (format: string | null, ...args: any[]) => void;
  glob: (pattern: string, value: string) => void;
  hex: (value: number | Buffer) => void;
  if: (...args: any[]) => void;
  instr: (a: string | Buffer | null, b: string | Buffer | null) => void;
  length: (value: any) => void;
  lower: (value: string) => void;
  ltrim: (value: string, remove?: string) => void;
  max: (a: any, b: any, ...rest: any[]) => void;
  min: (a: any, b: any, ...rest: any[]) => void;
  nullif: (a: any, b: any) => void;
  octetLength: (value: any) => void;
  replace: (value: any, occurances: any, substitute: any) => void;
  round: (value: number, places?: number) => void;
  rtrim: (value: string, remove?: string) => void;
  sign: (value: any) => void;
  substring: (value: string, start: number, length?: number) => void;
  trim: (value: string, remove?: string) => void;
  unhex: (hex: string, ignore?: string) => void;
  unicode: (value: string) => void;
  upper: (value: string) => void;
  date: (time?: string | number, ...modifers: string[]) => void;
  time: (time?: string | number, ...modifers: string[]) => void;
  dateTime: (time?: string | number, ...modifers: string[]) => void;
  julianDay: (time?: string | number, ...modifers: string[]) => void;
  unixEpoch: (time?: string | number, ...modifers: string[]) => void;
  strfTime: (format: string, time: string | number, ...modifers: string[]) => void;
  timeDiff: (start: string | number, end: string | number) => void;
  acos: (value: number) => void;
  acosh: (value: number) => void;
  asin: (value: number) => void;
  asinh: (value: number) => void;
  atan: (value: number) => void;
  atan2: (b: number, a: number) => void;
  atanh: (value: number) => void;
  ceil: (value: number) => void;
  cos: (value: number) => void;
  cosh: (value: number) => void;
  degrees: (value: number) => void;
  exp: (value: number) => void;
  floor: (value: number) => void;
  ln: (value: number) => void;
  log: (base: number, value: number) => void;
  mod: (value: number, divider: number) => void;
  pi: () => void;
  power: (value: number, exponent: number) => void;
  radians: (value: number) => void;
  sin: (value: number) => void;
  sinh: (value: number) => void;
  sqrt: (value: number) => void;
  tan: (value: number) => void;
  tanh: (value: number) => void;
  trunc: (value: number) => void;
  json: (text: string | Buffer) => void;
  jsonExtract: (json: string | Buffer, path: string) => void;
}

export interface Compute<T> {
  [key: string]: (column: T, method: ComputeMethods) => void;
}

export interface VirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, columns: Array<keyof T>): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<N>(params: W | null, column: (selector: T) => N): Promise<N | undefined>;
  get(query: HighlightQuery<W, T>): Promise<{ id: number, highlight: string } | undefined>;
  get(query: SnippetQuery<W, T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W | null): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: Array<keyof T>): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<N>(params: W | null, column: (selector: TableObject<T>) => N): Promise<Array<N>>;
  query<K extends keyof T>(query: VirtualQueryObject<W, K, T>): Promise<Array<Pick<T, K>>>;
  query<K extends keyof T>(query: VirtualQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query(query: VirtualQuery<W, T>): Promise<Array<T>>; 
  query(query: HighlightQuery<W, T>): Promise<Array<{ id: number, highlight: string }>>;
  query(query: SnippetQuery<W, T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface Queries<T, I, W, C, R, Y> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(options: UpdateQuery<W, I>): Promise<number>;
  upsert<K extends keyof T>(options: UpsertQuery<I, K>): Promise<R>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof (T & C)>(params: W | null, column: K): Promise<(T & C)[K] | undefined>;
  get<K extends keyof (T & C)>(params: W | null, columns: (keyof (T & C))[] | K[]): Promise<Pick<(T & C), K> | undefined>;
  get<N>(params: W | null, column: (selector: T) => N): Promise<N | undefined>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof (T & C)>(params: W | null, columns: (keyof (T & C))[] | K[]): Promise<Array<Pick<(T & C), K>>>;
  many<K extends keyof (T & C)>(params: W | null, column: K): Promise<Array<(T & C)[K]>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U, C>): Promise<Array<MergeIncludes<Pick<(T & C), K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U, C>): Promise<DebugResult<Array<MergeIncludes<Pick<(T & C), K>, U>>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U, C>): Promise<Array<MergeIncludes<Omit<T, K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U, C>): Promise<DebugResult<Array<MergeIncludes<Omit<T, K>, U>>>>;
  query<K extends keyof T>(query: ComplexQueryValue<W, K, T, C>): Promise<Array<(T & C)[K]>>;
  query<K extends keyof T>(query: ComplexQueryValueDebug<W, K, T, C>): Promise<DebugResult<Array<(T & C)[K]>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U, C>): Promise<Array<MergeIncludes<T, U>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U, C>): Promise<DebugResult<Array<MergeIncludes<T, U>>>>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U, C>): Promise<MergeIncludes<Pick<(T & C), K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U, C>): Promise<DebugResult<MergeIncludes<Pick<(T & C), K>, U> | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U, C>): Promise<MergeIncludes<Omit<T, K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U, C>): Promise<DebugResult<MergeIncludes<Omit<T, K>, U> | undefined>>;
  first<K extends keyof T>(query: ComplexQueryValue<W, K, T, C>): Promise<(T & C)[K] | undefined>;
  first<K extends keyof T>(query: ComplexQueryValueDebug<W, K, T, C>): Promise<DebugResult<(T & C)[K] | undefined>>;
  first<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U, C>): Promise<MergeIncludes<(T & C), U> | undefined>;
  first<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U, C>): Promise<DebugResult<MergeIncludes<(T & C), U> | undefined>>;
  count<K extends keyof (T & C)>(query?: AggregateQuery<W, K>): Promise<number>;
  count<K extends keyof (T & C)>(query?: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  avg<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<number>;
  avg<K extends keyof (T & C)>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  max<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<number>;
  max<K extends keyof (T & C)>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  min<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<number>;
  min<K extends keyof (T & C)>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  sum<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<number>;
  sum<K extends keyof (T & C)>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  exists(params: W | null): Promise<boolean>;
  groupBy<K extends keyof (T & C)>(columns: K | Array<K>): AggregateMethods<T, W, C, K, Y>;
  compute(properties: Compute<T>): void;
  remove(params?: W): Promise<number>;
}

interface Range<T> {
	gt?: T;
	gte?: T;
	lt?: T;
	lte?: T;
}

type CompareMethods<T> = {
  not: (value: T) => void;
	gt: (value: T) => void;
	lt: (value: T) => void;
	lte: (value: T) => void;
	like: (pattern: string) => void;
	match: (pattern: string) => void;
	glob: (pattern: string) => void;
	range: (limits: Range<T>) => void;
	eq: (value: T) => void;
}

type BooleanMethods<T> = {
  not: (value: T) => void;
  eq: (value: T) => void;
}

type ArrayMethods<T> = {
  includes: (value: T) => void;
  some: (selector: (value: ArrayTransform<T>) => void) => void;
}

type ArrayTransform<T> = T extends string | number | Date
  ? CompareMethods<T>
  : T extends boolean
  ? BooleanMethods<T>
  : T extends Array<infer U>
  ? ArrayMethods<U>
  : {
  [K in keyof T]: T[K] extends string | number | undefined
    ? CompareMethods<T[K]>
    : T[K] extends boolean | undefined
    ? BooleanMethods<T[K]>
    : T[K] extends Array<infer U>
    ? ArrayMethods<U>
    : T[K];
};

type Transform<T> = T extends string | number | Date
  ? CompareMethods<T>
  : T extends boolean
  ? BooleanMethods<T>
  : T extends Array<infer U>
  ? ArrayMethods<U>
  : {
  [K in keyof T]: T[K] extends string | number | undefined
    ? CompareMethods<T[K]>
    : T[K] extends boolean | undefined
    ? BooleanMethods<T[K]>
    : T[K] extends Array<infer U>
    ? ArrayMethods<U>
    : T[K];
};

type WhereFunction<T> = (builder: Transform<T>) => void;

type JsonValue = string | number | boolean | null;

type JsonArray = Array<Json>;

type JsonObject = {
  [key: string]: Json;
}

type JsonMap<T> = {
  [key: string]: T;
}

type Json = JsonValue | JsonObject | JsonArray;

type TableProperty = {
  [key: string]: TableProperty;
}

type TableObject<T> = {
  [key in keyof T]: TableProperty;
}

export interface SqlQueryParamsUnsafe<P, U> {
  params: P;
  unsafe: U;
}

export interface SqlQueryParams<P> {
  params: P;
  unsafe?: undefined;
}

export interface SqlQueryUnsafe<U> {
  params?: undefined;
  unsafe: U;
}

type WhereField<T> = NonNullable<T> | Array<NonNullable<T>> | WhereFunction<NonNullable<T>>;

type MaybeNullWhereField<T> = 
  T extends null ? null :
  null extends T ? WhereField<T> | null :
  WhereField<T>;

export type ToWhere<T> = {
  [K in keyof T]?: MaybeNullWhereField<T[K]>;
} & {
  and?: Array<ToWhere<T>>;
  or?: Array<ToWhere<T>>;
};
