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

export interface VirtualQuerySelector<W, T, N> extends VirtualQuery<W, T> {
  select: (selector: T) => N;
}

export interface AggregateQuery<W, K> {
  where?: W;
  column?: K;
  distinct?: K;
}

export interface AggregateQueryDebug<W, K> extends AggregateQuery<W, K> {
  debug: true;
}

export interface AggregateGroupQuery<T> {
  column?: keyof T;
  distinct?: keyof T;
}

export interface AggregateSelector<T> {
  count: (options?: AggregateGroupQuery<T>) => number;
  avg: (options: AggregateGroupQuery<T>) => number;
  min: (options: AggregateGroupQuery<T>) => number;
  max: (options: AggregateGroupQuery<T>) => number;
  sum: (options: AggregateGroupQuery<T>) => number;
  array<K extends keyof T>(select: K[]) : Array<Pick<T, K>>;
  array<K extends keyof T>(select: K) : Array<T[K]>;
  array() : Array<T>;
}

export interface Alias<T> {
  [key: string]: (columns: T) => any;
}

type PrimitiveMatch = string | number | Date | boolean;

type TransformAlias<T extends ObjectFunction> = {
  [K in keyof T as ReturnType<T[K]> extends PrimitiveMatch ? K : never]:
    ReturnType<T[K]> | Array<ReturnType<T[K]>> | WhereFunction<ReturnType<T[K]>> | null;
};

export interface GroupResult<T> {
  group: T[];
}

export interface GroupAlias<T> {
  [key: string]: (aggregate: AggregateSelector<T>) => any;
}

export interface GroupQueryAlias<W, T, K extends keyof T, U extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U> | Array<keyof T | ExtractKeys<U>>> {
  by: K | (keyof T)[] | K[];
  alias: U;
  where?: W & TransformAlias<U>;
}

export interface GroupQueryObject<W, B> extends Keywords<B> {
  by: B;
  alias: undefined;
  where?: W;
}

export interface ComplexQuery<W, T> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select?: undefined;
  include?: undefined;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryDebug<W, T> extends ComplexQuery<W, T> {
  debug: true;
}

export interface ComplexQueryAlias<W, T, N extends ObjectFunction> extends Keywords<Array<keyof T | ExtractKeys<N>> | keyof T | ExtractKeys<N>> {
  where?: W | TransformAlias<N>;
  select?: undefined;
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryAliasDebug<W, T, N> extends ComplexQueryAlias<W, T, N> {
  debug: true;
}

export interface ComplexQueryInclude<W, T, U extends ObjectFunction> extends Keywords<Array<keyof T | ExtractKeys<U>> | keyof T | ExtractKeys<U>> {
  where?: W | IncludeWhere<U>;
  select?: undefined;
  include: U;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryIncludeDebug<W, T, U extends ObjectFunction> extends ComplexQueryInclude<W, T, U> {
  debug: true;
}

export interface ComplexQueryIncludeAlias<W, T, U extends ObjectFunction, N extends ObjectFunction> extends Keywords<Array<keyof T | ExtractKeys<U & N>> | keyof T | ExtractKeys<U & N>> {
  where?: W | IncludeWhere<U> | TransformAlias<N>;
  select?: undefined;
  include: U;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryIncludeAliasDebug<W, T, U extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryIncludeAlias<W, T, U, N> {
  debug: true;
}

export interface ComplexQueryAlias<W, T, N> extends Keywords<Array<keyof T | ExtractKeys<N>> | keyof T | ExtractKeys<N>> {
  where?: W | TransformAlias<N>;
  select?: undefined;
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryAliasDebug<W, T, N extends ObjectFunction> extends ComplexQueryAlias<W, T, N> {
  debug: true;
}

export interface ComplexQueryObject<W, K, T> extends Keywords<keyof T | Array<keyof T>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryObjectDebug<W, K, T> extends ComplexQueryObject<W, K, T> {
  debug: true;
}

export interface ComplexQueryObjectOmit<W, K, T> extends Keywords<keyof T | Array<keyof T>> {
  where?: W;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include?: undefined;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryObjectOmitDebug<W, K, T> extends ComplexQueryObjectOmit<W, K, T> {
  debug: true;
}

export interface ComplexQueryObjectAlias<W, K, T, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<N> | Array<keyof T | ExtractKeys<N>>> {
  where?: W | TransformAlias<N>;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryObjectAliasDebug<W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAlias<W, K, T, N> {
  debug: true;
}

export interface ComplexQueryObjectAliasOmit<W, K, T, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<N> | Array<keyof T | ExtractKeys<N>>> {
  where?: W | TransformAlias<N>;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryObjectAliasOmitDebug<W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAliasOmit<W, K, T, N> {
  debug: true;
}

export interface ComplexQueryObjectInclude<W, K, T, U extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U> | Array<keyof T | ExtractKeys<U>>> {
  where?: W | IncludeWhere<U>;
  select: (keyof T)[] | K[];
  include: U;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryObjectIncludeDebug<W, K, T, U extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, U> {
  debug: true;
}

export interface ComplexQueryObjectIncludeOmit<W, K, T, U extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U> | Array<keyof T | ExtractKeys<U>>> {
  where?: W | IncludeWhere<U>;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include: U;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryObjectIncludeOmitDebug<W, K, T, U extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, U> {
  debug: true;
}

export interface ComplexQueryObjectIncludeAlias<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U & N> | Array<keyof T | ExtractKeys<U & N>>> {
  where?: W | IncludeWhere<U> | TransformAlias<N>;
  select: (keyof T)[] | K[];
  include: U;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryObjectIncludeAliasDebug<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAlias<W, K, T, U, N> {
  debug: true;
}

export interface ComplexQueryObjectIncludeAliasOmit<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U & N> | Array<keyof T | ExtractKeys<U & N>>> {
  where?: W | IncludeWhere<U> | TransformAlias<N>;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include: U;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryObjectIncludeAliasOmitDebug<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAliasOmit<W, K, T, U, N> {
  debug: true;
}

export interface ComplexQueryValue<W, K, T> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select: K;
}

export interface ComplexQueryValueDebug<W, K, T> extends ComplexQueryValue<W, K, T> {
  debug: true;
}

export interface ComplexQuerySelector<W, T, N> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select: (selector: T) => N;
}

export interface ComplexQuerySelectorDebug<W, T, N> extends ComplexQuerySelector<W, T, N> {
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

export interface DefineWhere<W> {
  where: (query: W) => void;
}

export interface DefineProperties<T, C> {
  [key: string]: (table: T, columns: C) => void;
}

export interface DefineQuery<T, C> {
  define: (properties: DefineProperties<T, C> | ((table: T, columns: C) => void)) => void;
}

export interface DebugQuery {
  sql: string;
  params?: any;
}

export interface DebugResult<R> {
  result: R;
  queries: Array<DebugQuery>;
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
  query<N>(query: VirtualQuerySelector<W, T, N>): Promise<Array<N>>;
  query(query: HighlightQuery<W, T>): Promise<Array<{ id: number, highlight: string }>>;
  query(query: SnippetQuery<W, T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface Queries<T, I, W, R, Y> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(options: UpdateQuery<W, I>): Promise<number>;
  upsert<K extends keyof T>(options: UpsertQuery<I, K>): Promise<R>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, columns: (keyof T)[] | K[]): Promise<Pick<T, K> | undefined>;
  get<N>(params: W | null, column: (selector: T) => N): Promise<N | undefined>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: (keyof T)[] | K[]): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<N>(params: W | null, column: (selector: T) => N): Promise<Array<N>>;
  query<K extends keyof T>(query: ComplexQueryObject<W, K, T>): Promise<Array<Pick<T, K>>>;
  query<K extends keyof T>(query: ComplexQueryObjectDebug<W, K, T>): Promise<DebugResult<Array<Pick<T, K>>>>;
  query<K extends keyof T>(query: ComplexQueryObjectOmit<W, K, T>): Promise<Array<Omit<T, K>>>;
  query<K extends keyof T>(query: ComplexQueryObjectOmitDebug<W, K, T>): Promise<DebugResult<Array<Omit<T, K>>>>;
  query<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAlias<W, K, T, N>): Promise<Array<Pick<T, K> & ReturnTypes<N>>>;
  query<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAliasDebug<W, K, T, N>): Promise<DebugResult<Array<Pick<T, K> & ReturnTypes<N>>>>;
  query<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAliasOmit<W, K, T, N>): Promise<Array<Omit<T, K> & ReturnTypes<N>>>;
  query<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAliasOmitDebug<W, K, T, N>): Promise<DebugResult<Array<Omit<T, K> & ReturnTypes<N>>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U>): Promise<Array<MergeIncludes<Pick<T, K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U>): Promise<DebugResult<Array<MergeIncludes<Pick<T, K>, U>>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U>): Promise<Array<MergeIncludes<Omit<T, K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U>): Promise<DebugResult<Array<MergeIncludes<Omit<T, K>, U>>>>;
  query<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAlias<W, K, T, U, N>): Promise<Array<MergeIncludes<Pick<T, K>, U> & ReturnTypes<N>>>;
  query<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAliasDebug<W, K, T, U, N>): Promise<DebugResult<Array<MergeIncludes<Pick<T, K>, U> & ReturnTypes<N>>>>;
  query<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAliasOmit<W, K, T, U, N>): Promise<Array<MergeIncludes<Omit<T, K>, U> & ReturnTypes<N>>>;
  query<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAliasOmitDebug<W, K, T, U, N>): Promise<DebugResult<Array<MergeIncludes<Omit<T, K>, U> & ReturnTypes<N>>>>;
  query<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query<K extends keyof T>(query: ComplexQueryValueDebug<W, K, T>): Promise<DebugResult<Array<T[K]>>>;
  query(query: ComplexQuery<W, T>): Promise<Array<T>>;
  query(query: ComplexQueryDebug<W, T>): Promise<DebugResult<Array<T>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U>): Promise<Array<MergeIncludes<T, U>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U>): Promise<DebugResult<Array<MergeIncludes<T, U>>>>;
  query<U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryIncludeAlias<W, T, U, N>): Promise<Array<MergeIncludes<T, U> & ReturnTypes<N>>>;
  query<U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryIncludeAliasDebug<W, T, U, N>): Promise<DebugResult<Array<MergeIncludes<T, U> & ReturnTypes<N>>>>;
  query<N extends Alias<T>>(query: ComplexQueryAlias<W, T, N>): Promise<Array<T & ReturnTypes<N>>>;
  query<N extends Alias<T>>(query: ComplexQueryAliasDebug<W, T, N>): Promise<DebugResult<Array<T & ReturnTypes<N>>>>;
  query<N>(query: ComplexQuerySelector<W, T, N>): Promise<Array<N>>;
  query<N>(query: ComplexQuerySelectorDebug<W, T, N>): Promise<DebugResult<Array<N>>>;
  first<K extends keyof T>(query: ComplexQueryObject<W, K, T>): Promise<Pick<T, K> | undefined>;
  first<K extends keyof T>(query: ComplexQueryObjectDebug<W, K, T>): Promise<DebugResult<Pick<T, K> | undefined>>;
  first<K extends keyof T>(query: ComplexQueryObjectOmit<W, K, T>): Promise<Omit<T, K> | undefined>;
  first<K extends keyof T>(query: ComplexQueryObjectOmitDebug<W, K, T>): Promise<DebugResult<Omit<T, K> | undefined>>;
  first<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAlias<W, K, T, N>): Promise<(Pick<T, K> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAliasDebug<W, K, T, N>): Promise<DebugResult<(Pick<T, K> & ReturnTypes<N>) | undefined>>;
  first<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAliasOmit<W, K, T, N>): Promise<(Omit<T, K> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAliasOmitDebug<W, K, T, N>): Promise<DebugResult<(Omit<T, K> & ReturnTypes<N>) | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U>): Promise<MergeIncludes<Pick<T, K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U>): Promise<DebugResult<MergeIncludes<Pick<T, K>, U> | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U>): Promise<MergeIncludes<Omit<T, K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U>): Promise<DebugResult<MergeIncludes<Omit<T, K>, U> | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAlias<W, K, T, U, N>): Promise<(MergeIncludes<Pick<T, K>, U> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAliasDebug<W, K, T, U, N>): Promise<DebugResult<(MergeIncludes<Pick<T, K>, U> & ReturnTypes<N>) | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAliasOmit<W, K, T, U, N>): Promise<(MergeIncludes<Omit<T, K>, U> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAliasOmitDebug<W, K, T, U, N>): Promise<DebugResult<(MergeIncludes<Omit<T, K>, U> & ReturnTypes<N>) | undefined>>;
  first<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<T[K] | undefined>;
  first<K extends keyof T>(query: ComplexQueryValueDebug<W, K, T>): Promise<DebugResult<T[K] | undefined>>;
  first(query: ComplexQuery<W, T>): Promise<T | undefined>;
  first(query: ComplexQueryDebug<W, T>): Promise<DebugResult<T | undefined>>;
  first<N extends Alias<T>>(query: ComplexQueryAlias<W, T, N>): Promise<(T & ReturnTypes<N>) | undefined>;
  first<N extends Alias<T>>(query: ComplexQueryAliasDebug<W, T, N>): Promise<DebugResult<(T & ReturnTypes<N>) | undefined>>;
  first<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U>): Promise<MergeIncludes<T, U> | undefined>;
  first<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U>): Promise<DebugResult<MergeIncludes<T, U> | undefined>>;
  first<U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryIncludeAlias<W, T, U, N>): Promise<(MergeIncludes<T, U> & ReturnTypes<N>) | undefined>;
  first<U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryIncludeAliasDebug<W, T, U, N>): Promise<DebugResult<(MergeIncludes<T, U> & ReturnTypes<N>) | undefined>>;
  first<N>(query: ComplexQuerySelector<W, T, N>): Promise<N | undefined>;
  first<N>(query: ComplexQuerySelectorDebug<W, T, N>): Promise<DebugResult<N | undefined>>;
  count<K extends keyof T>(query?: AggregateQuery<W, K>): Promise<number>;
  count<K extends keyof T>(query?: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  avg<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  avg<K extends keyof T>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  max<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  max<K extends keyof T>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  min<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  min<K extends keyof T>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  sum<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  sum<K extends keyof T>(query: AggregateQueryDebug<W, K>): Promise<DebugResult<number>>;
  exists(params: W | null): Promise<boolean>;
  group<K extends keyof T, B extends K | (keyof T)[] | K[]>(params: GroupQueryObject<W, B>): Promise<Array<Pick<T, B extends any[] ? B[number] : B> & GroupResult<T>>>;
  group<K extends keyof T, U extends GroupAlias<T>>(params: GroupQueryAlias<W, T, K, U>): Promise<Array<Pick<T, K> & ReturnTypes<U>>>;
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
