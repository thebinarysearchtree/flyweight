export interface Keywords<T> {
  orderBy?: Array<keyof T> | keyof T;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
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

export interface VirtualQueryObject<W, A, K, T, N> extends VirtualQuery<W, T> {
  select: (Alias<T, A, N> | K)[] | (keyof T)[];
}

export interface VirtualQueryValue<W, K, T> extends VirtualQuery<W, T> {
  select: K;
}

export interface VirtualQuerySelector<W, T, N> extends VirtualQuery<W, T> {
  select: (selector: T) => N;
}

export interface CountQuery<W> {
  where?: W;
  distinct?: boolean;
}

export interface ComplexQuery<W, T> extends Keywords<T> {
  where?: W;
  select: undefined;
}

export interface ComplexQueryObject<W, A extends string, K, T, N> extends Keywords<T & Record<A, null>> {
  where?: W;
  select: (Alias<T, A, N> | K)[] | (keyof T)[];
}

export interface ComplexQueryValue<W, K, T> extends Keywords<T> {
  where?: W;
  select: K;
}

export interface ComplexQuerySelector<W, T, N> extends Keywords<T> {
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

export interface VirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T, A extends string, N>(params: W | null, columns: (Alias<T, A, N> | K)[] | (keyof T)[]): Promise<(Pick<T, K> & Record<A, N>) | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<N>(params: W | null, column: (selector: T) => N): Promise<N | undefined>;
  get(query: HighlightQuery<W, T>): Promise<{ id: number, highlight: string } | undefined>;
  get(query: SnippetQuery<W, T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W | null): Promise<Array<T>>;
  many<K extends keyof T, A extends string, N>(params: W | null, columns: (Alias<T, A, N> | K)[] | (keyof T)[]): Promise<Array<(Pick<T, K> & Record<A, N>)>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<N>(params: W | null, column: (selector: TableObject<T>) => N): Promise<Array<N>>;
  query<K extends keyof T, A extends string, N>(query: VirtualQueryObject<W, A, K, T, N>): Promise<Array<(Pick<T, K> & Record<A, N>)>>;
  query<K extends keyof T>(query: VirtualQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query(query: VirtualQuery<W, T>): Promise<Array<T>>; 
  query<N>(query: VirtualQuerySelector<W, T, N>): Promise<Array<N>>;
  query(query: HighlightQuery<W, T>): Promise<Array<{ id: number, highlight: string }>>;
  query(query: SnippetQuery<W, T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface Queries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(options: UpdateQuery<W, I>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T, A extends string, N>(params: W | null, columns: (Alias<T, A, N> | K)[] | (keyof T)[]): Promise<(Pick<T, K> & Record<A, N>) | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<N>(params: W | null, column: (selector: T) => N): Promise<N | undefined>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof T, A extends string, N>(params: W | null, columns: (Alias<K, A, N> | K)[] | (keyof T)[]): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: N }, A>)>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<N>(params: W | null, column: (selector: T) => N): Promise<Array<N>>;
  query<K extends keyof T, A extends string, N>(query: ComplexQueryObject<W, A, K, T, N>): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: (N extends TableProperty ? JsonValue : N) }, A>)>>;
  query<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query(query: ComplexQuery<W, T>): Promise<Array<T>>;
  query<N>(query: ComplexQuerySelector<W, T, N>): Promise<Array<N>>;
  count(query: CountQuery<W>): Promise<number>;
  count(params: W | null): Promise<number>;
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

type ValueArrayMethods<T> = {
  includes: (value: T) => void;
}

type ObjectArrayMethods<T> = {
  some: (selector: (value: ArrayTransform<T>) => void) => void;
}

type ArrayTransform<T> = T extends string | number | boolean | Date
  ? T
  : {
  [K in keyof T]: T[K] extends string | number | undefined
    ? CompareMethods<T[K]>
    : T[K] extends boolean | undefined
    ? BooleanMethods<T[K]>
    : T[K];
};

type Transform<T> = T extends string | number | Date
  ? CompareMethods<T>
  : T extends boolean
  ? BooleanMethods<T>
  : T extends Array<infer U>
  ? U extends string | number | boolean | Date
    ? ValueArrayMethods<U>
    : ObjectArrayMethods<U>
  : {
  [K in keyof T]: T[K] extends string | number | undefined
    ? CompareMethods<T[K]>
    : T[K] extends boolean | undefined
    ? BooleanMethods<T[K]>
    : T[K] extends Array<infer U>
    ? U extends string | number | boolean | Date
      ? ValueArrayMethods<U>
      : ObjectArrayMethods<U>
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

type Alias<T, R, N> = {
  select: (selector: T) => N,
  as: R
}
