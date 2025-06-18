type ExtractKeys<U> = U extends Record<string, any> ? keyof U : keyof {};

interface Keywords<T, K> {
  orderBy?: K | ((column: T, method: ComputeMethods) => void);
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface Includes<T, R> {
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

interface VirtualKeywords<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  limit?: number;
  offset?: number;
}

interface Highlighter<T> extends VirtualKeywords<T> {
  highlight: { column: keyof T, tags: [string, string] };
}

interface Snippet<T> extends VirtualKeywords<T> {
  snippet: { column: keyof T, tags: [string, string], trailing: string, tokens: number };
}

interface HighlightQuery<W, T> extends Highlighter<T> {
  where?: W;
}

interface SnippetQuery<W, T> extends Snippet<T> {
  where?: W;
}

interface VirtualQuery<W, T> extends VirtualKeywords<T> {
  where?: W;
}

interface VirtualQueryObject<W, K, T> extends VirtualQuery<W, T> {
  select: (keyof T)[] | K[];
}

interface VirtualQueryValue<W, K, T> extends VirtualQuery<W, T> {
  select: K;
}

interface AggregateQuery<W, K> {
  where?: W;
  column?: K;
  distinct?: K;
}

interface AggregateQueryDebug<W, K> extends AggregateQuery<W, K> {
  debug: true;
}

interface GroupQueryObjectDebug<T, W, K, U> extends GroupQueryObject<T, W, K, U> {
  debug: true;
}

interface GroupQueryObjectAliasDebug<T, W, K, U, A> extends GroupQueryObjectAlias<T, W, K, U, A> {
  debug: true;
}

interface ComplexQueryInclude<W, T, U extends ObjectFunction, C> extends Keywords<T & C, Array<keyof (T & C)> | keyof (T & C)> {
  where?: W;
  select?: undefined;
  include?: U;
}

interface ComplexSqlQueryIncludeParamsUnsafe<P, U, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params: P;
  unsafe: U;
}

interface ComplexSqlQueryIncludeParams<P, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params: P;
  unsafe?: undefined;
}

interface ComplexSqlQueryIncludeUnsafe<U, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params?: undefined;
  unsafe: U;
}

interface ComplexSqlQueryInclude<W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

interface ComplexSqlQueryIncludeParamsUnsafeDebug<P, U, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeParamsUnsafe<P, U, W, T, R> {
  debug: true;
}

interface ComplexSqlQueryIncludeParamsDebug<P, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeParams<P, W, T, R> {
  debug: true;
}

interface ComplexSqlQueryIncludeUnsafeDebug<U, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeUnsafe<U, W, T, R> {
  debug: true;
}

interface ComplexSqlQueryIncludeDebug<W, T, R extends ObjectFunction> extends ComplexSqlQueryInclude<W, T, R> {
  debug: true;
}

interface ComplexQueryIncludeDebug<W, T, U extends ObjectFunction, C> extends ComplexQueryInclude<W, T, U, C> {
  debug: true;
}

interface ComplexQueryObjectInclude<W, K, T, U extends ObjectFunction, C> extends Keywords<T & C, keyof (T & C) | Array<keyof (T & C)>> {
  where?: W;
  select: (keyof (T & C))[] | K[];
  include?: U;
}

interface ComplexSqlQueryObjectIncludeParamsUnsafe<P, U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params: P;
  unsafe: U;
}

interface ComplexSqlQueryObjectIncludeParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params: P;
  unsafe?: undefined;
}

interface ComplexSqlQueryObjectIncludeUnsafe<U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params?: undefined;
  unsafe: U;
}

interface ComplexSqlQueryObjectInclude<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

interface ComplexSqlQueryObjectIncludeParamsUnsafeDebug<P, U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParamsUnsafe<P, U, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParams<P, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeUnsafeDebug<U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeUnsafe<U, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeDebug<W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectInclude<W, K, T, R> {
  debug: true;
}

interface ComplexQueryObjectIncludeDebug<W, K, T, U extends ObjectFunction, C> extends ComplexQueryObjectInclude<W, K, T, U, C> {
  debug: true;
}

interface ComplexQueryObjectIncludeOmit<W, K, T, U extends ObjectFunction, C> extends Keywords<T & C, keyof (T & C) | Array<keyof (T & C)>> {
  where?: W;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include?: U;
}

interface ComplexSqlQueryObjectIncludeOmitParamsUnsafe<P, U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params: P;
  unsafe: U;
}

interface ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params: P;
  unsafe?: undefined;
}

interface ComplexSqlQueryObjectIncludeOmitUnsafe<U, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params?: undefined;
  unsafe: U;
}

interface ComplexSqlQueryObjectIncludeOmit<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

interface ComplexSqlQueryObjectIncludeOmitParamsUnsafeDebug<P, U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParamsUnsafe<P, U, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeOmitParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeOmitUnsafeDebug<U, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitUnsafe<U, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeOmitDebug<W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmit<W, K, T, R> {
  debug: true;
}

interface ComplexQueryObjectIncludeOmitDebug<W, K, T, U extends ObjectFunction, C> extends ComplexQueryObjectIncludeOmit<W, K, T, U, C> {
  debug: true;
}

interface ComplexQueryValue<W, K, T, C> extends Keywords<T & C, Array<keyof (T & C)> | keyof (T & C)> {
  where?: W;
  select: K;
  omit?: undefined;
  include?: undefined;
}

interface ComplexSqlQueryValueParamsUnsafe<P, U, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params: P;
  unsafe: U;
}

interface ComplexSqlQueryValueParams<P, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params: P;
  unsafe?: undefined;
}

interface ComplexSqlQueryValueUnsafe<U, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params?: undefined;
  unsafe: U;
}

interface ComplexSqlQueryValue<W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params?: undefined;
  unsafe?: undefined;
}

interface ComplexSqlQueryValueParamsUnsafeDebug<P, U, W, K, T> extends ComplexSqlQueryValueParamsUnsafe<P, U, W, K, T> {
  debug: true;
}

interface ComplexSqlQueryValueParamsDebug<P, W, K, T> extends ComplexSqlQueryValueParams<P, W, K, T> {
  debug: true;
}

interface ComplexSqlQueryValueUnsafeDebug<U, W, K, T> extends ComplexSqlQueryValueUnsafe<U, W, K, T> {
  debug: true;
}

interface ComplexSqlQueryValueDebug<W, K, T> extends ComplexSqlQueryValue<W, K, T> {
  debug: true;
}

interface ComplexQueryValueDebug<W, K, T, C> extends ComplexQueryValue<W, K, T, C> {
  debug: true;
}

type MakeOptionalNullable<T> = {
  [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K];
};

type AddComputed<T> = {
  [K in keyof T]: T[K] | ((column: T, methods: ComputeMethods) => void);
};

interface UpdateQuery<W, T> {
  where?: W | null;
  set: Partial<AddComputed<MakeOptionalNullable<T>>>;
}

interface UpsertQuery<T, K> {
  values: T;
  target?: K;
  set?: Partial<MakeOptionalNullable<T>>;
}

interface DebugQuery {
  sql: string;
  params?: any;
}

interface DebugResult<R> {
  result: R;
  queries: Array<DebugQuery>;
}

interface GroupQueryObject<T, W, K, U> {
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

interface GroupQueryObjectAlias<T, W, K, U, A> {
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

interface GroupArrayKeywords<T, W, K, U> {
  where?: W;
  column?: keyof T;
  distinct?: keyof T;
  orderBy?: K;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include?: U;
}

interface GroupArray<T, W, K, U> extends GroupArrayKeywords<T, W, K, U> {
  select?: undefined;
  alias?: undefined;
}

interface GroupArrayAlias<T, W, K, U, A> extends GroupArrayKeywords<T, W, K, U> {
  select?: undefined;
  alias: A;
}

interface GroupArraySelect<T, W, K, U, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S[];
  alias?: undefined;
}

interface GroupArraySelectAlias<T, W, K, U, A, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S[];
  alias: A;
}

interface GroupArrayValue<T, W, K, U, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S;
  alias?: undefined;
}

interface GroupArrayValueAlias<T, W, K, U, A, S> extends GroupArrayKeywords<T, W, K, U> {
  select: S;
  alias: A;
}

interface AggregateMethods<T, W, C, K extends keyof (T & C), Y> {
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

interface ComputeMethods {
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
  plus: (...args: number[]) => void;
  minus: (...args: number[]) => void;
  divide: (...args: number[]) => void;
  multiply: (...args: number[]) => void;
}

interface Compute<T> {
  [key: string]: (column: T, method: ComputeMethods) => void;
}

interface VirtualQueries<T, W> {
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

interface Queries<T, I, W, C, R, Y> {
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
  query<K extends keyof (T & C)>(query: ComplexQueryValue<W, K, T, C>): Promise<Array<(T & C)[K]>>;
  query<K extends keyof (T & C)>(query: ComplexQueryValueDebug<W, K, T, C>): Promise<DebugResult<Array<(T & C)[K]>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U, C>): Promise<Array<MergeIncludes<Pick<(T & C), K>, U>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U, C>): Promise<DebugResult<Array<MergeIncludes<Pick<(T & C), K>, U>>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U, C>): Promise<Array<MergeIncludes<Omit<T, K>, U>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U, C>): Promise<DebugResult<Array<MergeIncludes<Omit<T, K>, U>>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U, C>): Promise<Array<MergeIncludes<T, U>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U, C>): Promise<DebugResult<Array<MergeIncludes<T, U>>>>;
  first<K extends keyof (T & C)>(query: ComplexQueryValue<W, K, T, C>): Promise<(T & C)[K] | undefined>;
  first<K extends keyof (T & C)>(query: ComplexQueryValueDebug<W, K, T, C>): Promise<DebugResult<(T & C)[K] | undefined>>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U, C>): Promise<MergeIncludes<Pick<(T & C), K>, U> | undefined>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U, C>): Promise<DebugResult<MergeIncludes<Pick<(T & C), K>, U> | undefined>>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U, C>): Promise<MergeIncludes<Omit<T, K>, U> | undefined>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U, C>): Promise<DebugResult<MergeIncludes<Omit<T, K>, U> | undefined>>;
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

type CompareMethods<T> = {
  not: (value: T) => void;
	gt: (value: NonNullable<T>) => void;
	lt: (value: NonNullable<T>) => void;
	lte: (value: NonNullable<T>) => void;
	like: (pattern: NonNullable<T>) => void;
	match: (pattern: NonNullable<T>) => void;
	glob: (pattern: NonNullable<T>) => void;
	eq: (value: T) => void;
}

type Transform<T> = NonNullable<T> extends string | number | Date
  ? CompareMethods<T>
  : NonNullable<T> extends boolean
  ? Pick<CompareMethods<T>, 'not' | 'eq'>
  : T;

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

interface SqlQueryParamsUnsafe<P, U> {
  params: P;
  unsafe: U;
}

interface SqlQueryParams<P> {
  params: P;
  unsafe?: undefined;
}

interface SqlQueryUnsafe<U> {
  params?: undefined;
  unsafe: U;
}

type WhereField<T> = T | Array<NonNullable<T>> | WhereFunction<T>;

type OptionalToNull<T> = {
  [K in keyof T]-?: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K];
};

type ReplaceJson<T> =
  null extends T
    ? ReplaceJson<Exclude<T, null>> | null
    : JsonObject extends T
      ? string
      : [] extends T
        ? string
        : T;

type ToWhere<T> = {
  [K in keyof T]?: WhereField<ReplaceJson<T[K]>>;
} & {
  and?: Array<ToWhere<T>>;
  or?: Array<ToWhere<T>>;
};
