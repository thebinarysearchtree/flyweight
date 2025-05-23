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
    ? P extends string | number | Date | boolean ? R | Array<R> | WhereFunction<R> | null : never : never;
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
  where?: W | Partial<TransformAlias<U>>;
}

export interface GroupQueryAliasDebug<W, T, K extends keyof T, U extends ObjectFunction> extends GroupQueryAlias<W, T, K, U> {
  debug: true;
}

export interface GroupQueryObject<W, B> extends Keywords<B> {
  by: B;
  alias: undefined;
  where?: W;
}

export interface GroupQueryObjectDebug<W, B> extends GroupQueryObject<W, B> {
  debug: true;
}

export interface ComplexQuery<W, T> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select?: undefined;
  include?: undefined;
  alias?: undefined;
}

export interface ComplexSqlQueryParamsUnsafe<P, U, W, T> extends ComplexQuery<W, T> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryParams<P, W, T> extends ComplexQuery<W, T> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryUnsafe<U, W, T> extends ComplexQuery<W, T> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQuery<W, T> extends ComplexQuery<W, T> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryParamsUnsafeDebug<P, W, T, U> extends ComplexSqlQueryParamsUnsafe<P, W, T, U> {
  debug: true;
}

export interface ComplexSqlQueryParamsDebug<P, W, T> extends ComplexSqlQueryParams<P, W, T> {
  debug: true;
}

export interface ComplexSqlQueryUnsafeDebug<U, W, T> extends ComplexSqlQueryUnsafe<U, W, T> {
  debug: true;
}

export interface ComplexSqlQueryDebug<W, T> extends ComplexSqlQuery<W, T> {
  debug: true;
}

export interface ComplexQueryDebug<W, T> extends ComplexQuery<W, T> {
  debug: true;
}

export interface ComplexQueryAlias<W, T, N extends ObjectFunction> extends Keywords<Array<keyof T | ExtractKeys<N>> | keyof T | ExtractKeys<N>> {
  where?: W | Partial<TransformAlias<N>>;
  select?: undefined;
  include?: undefined;
  alias: N;
}

export interface ComplexSqlQueryAliasParamsUnsafe<P, U, W, T, N extends ObjectFunction> extends ComplexQueryAlias<W, T, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryAliasParams<P, W, T, N extends ObjectFunction> extends ComplexQueryAlias<W, T, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryAliasUnsafe<U, W, T, N extends ObjectFunction> extends ComplexQueryAlias<W, T, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryAlias<W, T, N extends ObjectFunction> extends ComplexQueryAlias<W, T, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryAliasParamsUnsafeDebug<P, U, W, T, N extends ObjectFunction> extends ComplexSqlQueryAliasParamsUnsafe<P, U, W, T, N> {
  debug: true;
}

export interface ComplexSqlQueryAliasParamsDebug<P, W, T, N extends ObjectFunction> extends ComplexSqlQueryAliasParams<P, W, T, N> {
  debug: true;
}

export interface ComplexSqlQueryAliasUnsafeDebug<U, W, T, N extends ObjectFunction> extends ComplexSqlQueryAliasUnsafe<U, W, T, N> {
  debug: true;
}

export interface ComplexSqlQueryAliasDebug<W, T, N extends ObjectFunction> extends ComplexSqlQueryAlias<W, T, N> {
  debug: true;
}

export interface ComplexQueryAliasDebug<W, T, N> extends ComplexQueryAlias<W, T, N> {
  debug: true;
}

export interface ComplexQueryInclude<W, T, U extends ObjectFunction> extends Keywords<Array<keyof T | ExtractKeys<U>> | keyof T | ExtractKeys<U>> {
  where?: W | Partial<IncludeWhere<U>>;
  select?: undefined;
  include: U;
  alias?: undefined;
}

export interface ComplexSqlQueryIncludeParamsUnsafe<P, U, W, T, P extends ObjectFunction> extends ComplexQueryInclude<W, T, R> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryIncludeParams<P, W, T, P extends ObjectFunction> extends ComplexQueryInclude<W, T, R> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryIncludeUnsafe<U, W, T, P extends ObjectFunction> extends ComplexQueryInclude<W, T, R> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryInclude<W, T, P extends ObjectFunction> extends ComplexQueryInclude<W, T, R> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryIncludeParamsUnsafeDebug<P, U, W, T, P extends ObjectFunction> extends ComplexSqlQueryIncludeParamsUnsafe<P, U, W, T, R> {
  debug: true;
}

export interface ComplexSqlQueryIncludeParamsDebug<P, W, T, P extends ObjectFunction> extends ComplexSqlQueryIncludeParams<P, W, T, R> {
  debug: true;
}

export interface ComplexSqlQueryIncludeUnsafeDebug<U, W, T, P extends ObjectFunction> extends ComplexSqlQueryIncludeUnsafe<U, W, T, R> {
  debug: true;
}

export interface ComplexSqlQueryIncludeDebug<W, T, P extends ObjectFunction> extends ComplexSqlQueryInclude<W, T, R> {
  debug: true;
}

export interface ComplexQueryIncludeDebug<W, T, U extends ObjectFunction> extends ComplexQueryInclude<W, T, U> {
  debug: true;
}

export interface ComplexQueryIncludeAlias<W, T, U extends ObjectFunction, N extends ObjectFunction> extends Keywords<Array<keyof T | ExtractKeys<U & N>> | keyof T | ExtractKeys<U & N>> {
  where?: W | Partial<IncludeWhere<U>> | Partial<TransformAlias<N>>;
  select?: undefined;
  include: U;
  alias: N;
}

export interface ComplexSqlQueryIncludeAliasParamsUnsafe<P, U, W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryIncludeAlias<W, T, R, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryIncludeAliasParams<P, W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryIncludeAlias<W, T, R, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryIncludeAliasUnsafe<U, W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryIncludeAlias<W, T, R, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryIncludeAlias<W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryIncludeAlias<W, T, R, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryIncludeAliasParamsUnsafeDebug<P, U, W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryIncludeAliasParamsUnsafe<P, U, W, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryIncludeAliasParamsDebug<P, W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryIncludeAliasParams<P, W, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryIncludeAliasUnsafeDebug<U, W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryIncludeAliasUnsafe<U, W, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryIncludeAliasDebug<W, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryIncludeAlias<W, T, R, N> {
  debug: true;
}

export interface ComplexQueryIncludeAliasDebug<W, T, U extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryIncludeAlias<W, T, U, N> {
  debug: true;
}

export interface ComplexQueryAlias<W, T, N> extends Keywords<Array<keyof T | ExtractKeys<N>> | keyof T | ExtractKeys<N>> {
  where?: W | Partial<TransformAlias<N>>;
  select?: undefined;
  include?: undefined;
  alias: N;
}

export interface ComplexSqlQueryAliasParamsUnsafe<P, U, W, T, N> extends ComplexQueryAlias<W, T, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryAliasParams<P, W, T, N> extends ComplexQueryAlias<W, T, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryAliasUnsafe<U, W, T, N> extends ComplexQueryAlias<W, T, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryAlias<W, T, N> extends ComplexQueryAlias<W, T, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryAliasParamsUnsafeDebug<P, U, W, T, N extends ObjectFunction> extends ComplexSqlQueryAliasParamsUnsafe<P, U, W, T, N> {
  debug: true;
}

export interface ComplexSqlQueryAliasParamsDebug<P, W, T, N extends ObjectFunction> extends ComplexSqlQueryAliasParams<P, W, T, N> {
  debug: true;
}

export interface ComplexSqlQueryAliasUnsafeDebug<U, W, T, N extends ObjectFunction> extends ComplexSqlQueryAliasUnsafe<U, W, T, N> {
  debug: true;
}

export interface ComplexSqlQueryAliasDebug<W, T, N extends ObjectFunction> extends ComplexSqlQueryAlias<W, T, N> {
  debug: true;
}

export interface ComplexQueryAliasDebug<W, T, N extends ObjectFunction> extends ComplexQueryAlias<W, T, N> {
  debug: true;
}

export interface ComplexQueryObject<W, K, T> extends Keywords<keyof T | Array<keyof T>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias?: undefined;
}

export interface ComplexSqlQueryObjectParamsUnsafe<P, U, W, K, T> extends ComplexQueryObject<W, K, T> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectParams<P, W, K, T> extends ComplexQueryObject<W, K, T> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectUnsafe<U, W, K, T> extends ComplexQueryObject<W, K, T> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObject<W, K, T> extends ComplexQueryObject<W, K, T> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectParamsUnsafeDebug<P, U, W, K, T> extends ComplexSqlQueryObjectParamsUnsafe<P, U, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryObjectParamsDebug<P, W, K, T> extends ComplexSqlQueryObjectParams<P, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryObjectUnsafeDebug<U, W, K, T> extends ComplexSqlQueryObjectUnsafe<U, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryObjectDebug<W, K, T> extends ComplexSqlQueryObject<W, K, T> {
  debug: true;
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
}

export interface ComplexSqlQueryObjectOmitParamsUnsafe<P, U, W, K, T> extends ComplexQueryObjectOmit<W, K, T> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectOmitParams<P, W, K, T> extends ComplexQueryObjectOmit<W, K, T> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectOmitUnsafe<U, W, K, T> extends ComplexQueryObjectOmit<W, K, T> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectOmit<W, K, T> extends ComplexQueryObjectOmit<W, K, T> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectOmitParamsUnsafeDebug<P, U, W, K, T> extends ComplexSqlQueryObjectOmitParamsUnsafe<P, U, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryObjectOmitParamsDebug<P, W, K, T> extends ComplexSqlQueryObjectOmitParams<P, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryObjectOmitUnsafeDebug<U, W, K, T> extends ComplexSqlQueryObjectOmitUnsafe<U, W, K, T> {
  debug: true;
}

export interface ComplexSqlQueryObjectOmitDebug<W, K, T> extends ComplexSqlQueryObjectOmit<W, K, T> {
  debug: true;
}

export interface ComplexQueryObjectOmitDebug<W, K, T> extends ComplexQueryObjectOmit<W, K, T> {
  debug: true;
}

export interface ComplexQueryObjectAlias<W, K, T, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<N> | Array<keyof T | ExtractKeys<N>>> {
  where?: W | Partial<TransformAlias<N>>;
  select: (keyof T)[] | K[];
  include?: undefined;
  alias: N;
}

export interface ComplexSqlQueryObjectAliasParamsUnsafe<P, U, W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAlias<W, K, T, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectAliasParams<P, W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAlias<W, K, T, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectAliasUnsafe<U, W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAlias<W, K, T, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectAlias<W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAlias<W, K, T, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectAliasParamsUnsafeDebug<P, U, W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasParamsUnsafe<P, U, W, K, T, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectAliasParamsDebug<P, W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasParams<P, W, K, T, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectAliasUnsafeDebug<U, W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasUnsafe<U, W, K, T, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectAliasDebug<W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAlias<W, K, T, N> {
  debug: true;
}

export interface ComplexQueryObjectAliasDebug<W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAlias<W, K, T, N> {
  debug: true;
}

export interface ComplexQueryObjectAliasOmit<W, K, T, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<N> | Array<keyof T | ExtractKeys<N>>> {
  where?: W | Partial<TransformAlias<N>>;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include?: undefined;
  alias: N;
}

export interface ComplexSqlQueryObjectAliasOmitParamsUnsafe<P, U, W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAliasOmit<W, K, T, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectAliasOmitParams<P, W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAliasOmit<W, K, T, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectAliasOmitUnsafe<U, W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAliasOmit<W, K, T, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectAliasOmit<W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAliasOmit<W, K, T, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectAliasOmitParamsUnsafeDebug<P, U, W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasOmitParamsUnsafe<P, U, W, K, T, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectAliasOmitParamsDebug<P, W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasOmitParams<P, W, K, T, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectAliasOmitUnsafeDebug<U, W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasOmitUnsafe<U, W, K, T, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectAliasOmitDebug<W, K, T, N extends ObjectFunction> extends ComplexSqlQueryObjectAliasOmit<W, K, T, N> {
  debug: true;
}

export interface ComplexQueryObjectAliasOmitDebug<W, K, T, N extends ObjectFunction> extends ComplexQueryObjectAliasOmit<W, K, T, N> {
  debug: true;
}

export interface ComplexQueryObjectInclude<W, K, T, U extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U> | Array<keyof T | ExtractKeys<U>>> {
  where?: W | Partial<IncludeWhere<U>>;
  select: (keyof T)[] | K[];
  include: U;
  alias?: undefined;
}

export interface ComplexSqlQueryObjectIncludeParamsUnsafe<P, U, W, K, T, P extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeParams<P, W, K, T, P extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeUnsafe<U, W, K, T, P extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectInclude<W, K, T, P extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeParamsUnsafeDebug<P, U, W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParamsUnsafe<P, U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeParamsDebug<P, W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParams<P, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeUnsafeDebug<U, W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeUnsafe<U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeDebug<W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectInclude<W, K, T, R> {
  debug: true;
}

export interface ComplexQueryObjectIncludeDebug<W, K, T, U extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, U> {
  debug: true;
}

export interface ComplexQueryObjectIncludeOmit<W, K, T, U extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U> | Array<keyof T | ExtractKeys<U>>> {
  where?: W | Partial<IncludeWhere<U>>;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include: U;
  alias?: undefined;
}

export interface ComplexSqlQueryObjectIncludeOmitParamsUnsafe<P, U, W, K, T, P extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, P extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeOmitUnsafe<U, W, K, T, P extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeOmit<W, K, T, P extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeOmitParamsUnsafeDebug<P, U, W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParamsUnsafe<P, U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeOmitParamsDebug<P, W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeOmitUnsafeDebug<U, W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitUnsafe<U, W, K, T, R> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeOmitDebug<W, K, T, P extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmit<W, K, T, R> {
  debug: true;
}

export interface ComplexQueryObjectIncludeOmitDebug<W, K, T, U extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, U> {
  debug: true;
}

export interface ComplexQueryObjectIncludeAlias<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U & N> | Array<keyof T | ExtractKeys<U & N>>> {
  where?: W | Partial<IncludeWhere<U>> | Partial<TransformAlias<N>>;
  select: (keyof T)[] | K[];
  include: U;
  alias: N;
}

export interface ComplexSqlQueryObjectIncludeAliasParamsUnsafe<P, U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAlias<W, K, T, R, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeAliasParams<P, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAlias<W, K, T, R, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeAliasUnsafe<U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAlias<W, K, T, R, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeAlias<W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAlias<W, K, T, R, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeAliasParamsUnsafeDebug<P, U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasParamsUnsafe<P, U, W, K, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeAliasParamsDebug<P, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasParams<P, W, K, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeAliasUnsafeDebug<U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasUnsafe<U, W, K, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeAliasDebug<W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAlias<W, K, T, R, N> {
  debug: true;
}

export interface ComplexQueryObjectIncludeAliasDebug<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAlias<W, K, T, U, N> {
  debug: true;
}

export interface ComplexQueryObjectIncludeAliasOmit<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends Keywords<keyof T | ExtractKeys<U & N> | Array<keyof T | ExtractKeys<U & N>>> {
  where?: W | Partial<IncludeWhere<U>> | Partial<TransformAlias<N>>;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include: U;
  alias: N;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitParamsUnsafe<P, U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAliasOmit<W, K, T, R, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitParams<P, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAliasOmit<W, K, T, R, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitUnsafe<U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAliasOmit<W, K, T, R, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryObjectIncludeAliasOmit<W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAliasOmit<W, K, T, R, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitParamsUnsafeDebug<P, U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasOmitParamsUnsafe<P, U, W, K, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitParamsDebug<P, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasOmitParams<P, W, K, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitUnsafeDebug<U, W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasOmitUnsafe<U, W, K, T, R, N> {
  debug: true;
}

export interface ComplexSqlQueryObjectIncludeAliasOmitDebug<W, K, T, P extends ObjectFunction, N extends ObjectFunction> extends ComplexSqlQueryObjectIncludeAliasOmit<W, K, T, R, N> {
  debug: true;
}

export interface ComplexQueryObjectIncludeAliasOmitDebug<W, K, T, U extends ObjectFunction, N extends ObjectFunction> extends ComplexQueryObjectIncludeAliasOmit<W, K, T, U, N> {
  debug: true;
}

export interface ComplexQueryValue<W, K, T> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select: K;
  omit?: undefined;
  include?: undefined;
  alias?: undefined;
}

export interface ComplexSqlQueryValueParamsUnsafe<P, U, W, K, T> extends ComplexQueryValue<W, K, T> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQueryValueParams<P, W, K, T> extends ComplexQueryValue<W, K, T> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQueryValueUnsafe<U, W, K, T> extends ComplexQueryValue<W, K, T> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQueryValue<W, K, T> extends ComplexQueryValue<W, K, T> {
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

export interface ComplexQueryValueDebug<W, K, T> extends ComplexQueryValue<W, K, T> {
  debug: true;
}

export interface ComplexQuerySelector<W, T, N> extends Keywords<Array<keyof T> | keyof T> {
  where?: W;
  select: (selector: T) => N;
}

export interface ComplexSqlQuerySelectorParamsUnsafe<P, U, W, T, N> extends ComplexQuerySelector<W, T, N> {
  params: P;
  unsafe: U;
}

export interface ComplexSqlQuerySelectorParams<P, W, T, N> extends ComplexQuerySelector<W, T, N> {
  params: P;
  unsafe?: undefined;
}

export interface ComplexSqlQuerySelectorUnsafe<U, W, T, N> extends ComplexQuerySelector<W, T, N> {
  params?: undefined;
  unsafe: U;
}

export interface ComplexSqlQuerySelector<W, T, N> extends ComplexQuerySelector<W, T, N> {
  params?: undefined;
  unsafe?: undefined;
}

export interface ComplexSqlQuerySelectorParamsUnsafeDebug<P, U, W, T, N> extends ComplexSqlQuerySelectorParamsUnsafe<P, U, W, T, N> {
  debug: true;
}

export interface ComplexSqlQuerySelectorParamsDebug<P, W, T, N> extends ComplexSqlQuerySelectorParams<P, W, T, N> {
  debug: true;
}

export interface ComplexSqlQuerySelectorUnsafeDebug<U, W, T, N> extends ComplexSqlQuerySelectorUnsafe<U, W, T, N> {
  debug: true;
}

export interface ComplexSqlQuerySelectorDebug<W, T, N> extends ComplexSqlQuerySelector<W, T, N> {
  debug: true;
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
  group<K extends keyof T, B extends K | (keyof T)[] | K[]>(params: GroupQueryObjectDebug<W, B>): Promise<DebugResult<Array<Pick<T, B extends any[] ? B[number] : B> & GroupResult<T>>>>;
  group<K extends keyof T, U extends GroupAlias<T>>(params: GroupQueryAlias<W, T, K, U>): Promise<Array<Pick<T, K> & ReturnTypes<U>>>;
  group<K extends keyof T, U extends GroupAlias<T>>(params: GroupQueryAliasDebug<W, T, K, U>): Promise<DebugResult<Array<Pick<T, K> & ReturnTypes<U>>>>;
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
