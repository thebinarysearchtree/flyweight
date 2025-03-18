type ExtractIncludedKeys<U> = U extends Record<string, any> ? keyof U : keyof {};

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

type MergeIncludes<T, U> = 
  T & { [K in keyof U]: ReturnType<U[K]> extends Promise<infer R> ? R : never;
};

type ReturnTypes<T> = {
  [K in keyof T]: ReturnType<T[K]>;
};

type ConvertAlias<T, U> = 
  T & { [K in keyof U]: ReturnType<U[K]> extends Promise<infer R> ? R : never;
};

type IncludeWhere<T, U> = {
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

export interface CountQuery<W, K> {
  where?: W;
  column?: K;
  distinct?: K;
}

export interface AggregateQuery<W, K> {
  where?: W;
  column?: K;
  distinct?: K;
}

export interface Alias<T> {
  [key: string]: (columns: T) => any;
}

export interface ComplexQuery<W, T> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select?: undefined;
  include?: undefined;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryWith<W, T, C> extends Keywords<Array<keyof T | ExtractIncludedKeys<C>> | keyof T | ExtractIncludedKeys<C>> {
  where?: W;
  select?: undefined;
  include?: undefined;
  alias?: undefined;
  with: C;
}

export interface ComplexQueryAlias<W, T, N> extends Keywords<Array<keyof T | ExtractIncludedKeys<N>> | keyof T | ExtractIncludedKeys<N>> {
  where?: W;
  select?: undefined;
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryAliasWith<W, T, N, C> extends Keywords<Array<keyof T | ExtractIncludedKeys<N & C>> | keyof T | ExtractIncludedKeys<N & C>> {
  where?: W;
  select?: undefined;
  include?: undefined;
  alias: N;
  with: C;
}

export interface ComplexQueryInclude<W, T, U> extends Keywords<Array<keyof T | ExtractIncludedKeys<U>> | keyof T | ExtractIncludedKeys<U>> {
  where?: W | IncludeWhere<T, U>;
  select?: undefined;
  include: U;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryIncludeWith<W, T, U, C> extends Keywords<Array<keyof T | ExtractIncludedKeys<U & C>> | keyof T | ExtractIncludedKeys<U & C>> {
  where?: W | IncludeWhere<T, U>;
  select?: undefined;
  include: U;
  alias?: undefined;
  with: C;
}

export interface ComplexQueryIncludeAlias<W, T, U, N> extends Keywords<Array<keyof T | ExtractIncludedKeys<U & N>> | keyof T | ExtractIncludedKeys<U & N>> {
  where?: W | IncludeWhere<T, U>;
  select?: undefined;
  include: U;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryIncludeAliasWith<W, T, U, N, C> extends Keywords<Array<keyof T | ExtractIncludedKeys<U & N & C>> | keyof T | ExtractIncludedKeys<U & N & C>> {
  where?: W | IncludeWhere<T, U>;
  select?: undefined;
  include: U;
  alias: N;
  with: C;
}

export interface ComplexQueryAlias<W, T, N> extends Keywords<Array<keyof T | ExtractIncludedKeys<N>> | keyof T | ExtractIncludedKeys<N>> {
  where?: W | IncludeWhere<T, U>;
  select?: undefined;
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryAliasWith<W, T, N, C> extends Keywords<Array<keyof T | ExtractIncludedKeys<N & C>> | keyof T | ExtractIncludedKeys<N & C>> {
  where?: W | IncludeWhere<T, U>;
  select?: undefined;
  include?: undefined;
  alias: N;
  with: C;
}

export interface ComplexQueryObject<W, K, T> extends Keywords<keyof T | Array<keyof T>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryObjectWith<W, K, T, C> extends Keywords<keyof T | ExtractIncludedKeys<C> | Array<keyof T | ExtractIncludedKeys<C>>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias?: undefined;
  with: C;
}

export interface ComplexQueryObjectAlias<W, K, T, N> extends Keywords<keyof T | ExtractIncludedKeys<N> | Array<keyof T | ExtractIncludedKeys<N>>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryObjectAliasWith<W, K, T, N, C> extends Keywords<keyof T | ExtractIncludedKeys<N & C> | Array<keyof T | ExtractIncludedKeys<N & C>>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias: N;
  with: C;
}

export interface ComplexQueryObjectInclude<W, K, T, U> extends Keywords<keyof T | ExtractIncludedKeys<U> | Array<keyof T | ExtractIncludedKeys<U>>> {
  where?: W | IncludeWhere<T, U>;
  select: (keyof T)[] | K[];
  include: U;
  alias?: undefined;
  with?: undefined;
}

export interface ComplexQueryObjectIncludeWith<W, K, T, U, C> extends Keywords<keyof T | ExtractIncludedKeys<U & C> | Array<keyof T | ExtractIncludedKeys<U & C>>> {
  where?: W | IncludeWhere<T, U>;
  select: (keyof T)[] | K[];
  include: U;
  alias?: undefined;
  with: C;
}

export interface ComplexQueryObjectIncludeAlias<W, K, T, U, N> extends Keywords<keyof T | ExtractIncludedKeys<U & N> | Array<keyof T | ExtractIncludedKeys<U & N>>> {
  where?: W | IncludeWhere<T, U>;
  select: (keyof T)[] | K[];
  include: U;
  alias: N;
  with?: undefined;
}

export interface ComplexQueryObjectIncludeAliasWith<W, K, T, U, N, C> extends Keywords<keyof T | ExtractIncludedKeys<U & N & C> | Array<keyof T | ExtractIncludedKeys<U & N & C>>> {
  where?: W | IncludeWhere<T, U>;
  select: (keyof T)[] | K[];
  include: U;
  alias: N;
  with: C;
}

export interface ComplexQueryValue<W, K, T> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select: K;
}

export interface ComplexQuerySelector<W, T, N> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select: (selector: T) => N;
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

export interface Queries<T, I, W, R, Y, P> {
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
  query<K extends keyof T, C extends P>(query: ComplexQueryObjectWith<W, K, T, C>): Promise<Array<MergeIncludes<Pick<T, K>, C>>>;
  query<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAlias<W, K, T, N>): Promise<Array<Pick<T, K> & ReturnTypes<N>>>;
  query<K extends keyof T, N extends Alias<T>, C extends P>(query: ComplexQueryObjectAliasWith<W, K, T, N, C>): Promise<Array<MergeIncludes<Pick<T, K>, C> & ReturnTypes<N>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U>): Promise<Array<MergeIncludes<Pick<T, K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>, C extends P>(query: ComplexQueryObjectIncludeWith<W, K, T, U, C>): Promise<Array<MergeIncludes<Pick<T, K>, U & C>>>;
  query<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAlias<W, K, T, U, N>): Promise<Array<MergeIncludes<Pick<T, K>, U> & ReturnTypes<N>>>;
  query<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query(query: ComplexQuery<W, T>): Promise<Array<T>>;
  query<C extends P>(query: ComplexQueryWith<W, T, C>): Promise<Array<MergeIncludes<T, C>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U>): Promise<Array<MergeIncludes<T, U>>>;
  query<U extends Includes<Y, T>, C extends P>(query: ComplexQueryIncludeWith<W, T, U, C>): Promise<Array<MergeIncludes<T, U & C>>>;
  query<U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryIncludeAlias<W, T, U, N>): Promise<Array<MergeIncludes<T, U> & ReturnTypes<N>>>;
  query<U extends Includes<Y, T>, N extends Alias<T>, C extends P>(query: ComplexQueryIncludeAliasWith<W, T, U, N, C>): Promise<Array<MergeIncludes<T, U & C> & ReturnTypes<N>>>;
  query<N extends Alias<T>>(query: ComplexQueryAlias<W, T, N>): Promise<Array<T & ReturnTypes<N>>>;
  query<N>(query: ComplexQuerySelector<W, T, N>): Promise<Array<N>>;
  first<K extends keyof T>(query: ComplexQueryObject<W, K, T>): Promise<Pick<T, K> | undefined>;
  first<K extends keyof T, C extends P>(query: ComplexQueryObjectWith<W, K, T, C>): Promise<MergeIncludes<Pick<T, K>, C> | undefined>;
  first<K extends keyof T, N extends Alias<T>>(query: ComplexQueryObjectAlias<W, K, T, N>): Promise<(Pick<T, K> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, N extends Alias<T>, C extends P>(query: ComplexQueryObjectAliasWith<W, K, T, N, C>): Promise<(MergeIncludes<Pick<T, K>, C> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U>): Promise<MergeIncludes<Pick<T, K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>, C extends P>(query: ComplexQueryObjectIncludeWith<W, K, T, U, C>): Promise<MergeIncludes<Pick<T, K>, U & C> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryObjectIncludeAlias<W, K, T, U, N>): Promise<(MergeIncludes<Pick<T, K>, U> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>, N extends Alias<T>, C extends P>(query: ComplexQueryObjectIncludeAliasWith<W, K, T, U, N, C>): Promise<(MergeIncludes<Pick<T, K>, U & C> & ReturnTypes<N>) | undefined>;
  first<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<T[K] | undefined>;
  first(query: ComplexQuery<W, T>): Promise<T | undefined>;
  first<C extends P>(query: ComplexQueryWith<W, T, C>): Promise<MergeIncludes<T, C> | undefined>;
  first<N extends Alias<T>>(query: ComplexQueryAlias<W, T, N>): Promise<(T & ReturnTypes<N>) | undefined>;
  first<N extends Alias<T>, C extends P>(query: ComplexQueryAliasWith<W, T, N, C>): Promise<(MergeIncludes<T, C> & ReturnTypes<N>) | undefined>;
  first<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U>): Promise<MergeIncludes<T, U> | undefined>;
  first<U extends Includes<Y, T>, C extends P>(query: ComplexQueryIncludeWith<W, T, U, C>): Promise<MergeIncludes<T, U & C> | undefined>;
  first<U extends Includes<Y, T>, N extends Alias<T>>(query: ComplexQueryIncludeAlias<W, T, U, N>): Promise<(MergeIncludes<T, U> & ReturnTypes<N>) | undefined>;
  first<U extends Includes<Y, T>, N extends Alias<T>, C extends P>(query: ComplexQueryIncludeAliasWith<W, T, U, N, C>): Promise<(MergeIncludes<T, U & C> & ReturnTypes<N>) | undefined>;
  first<N>(query: ComplexQuerySelector<W, T, N>): Promise<N | undefined>;
  count<K extends keyof T>(query?: CountQuery<W, K>): Promise<number>;
  avg<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  max<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  min<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  sum<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  exists(params: W | null): Promise<boolean>;
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
