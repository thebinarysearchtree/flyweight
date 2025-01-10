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

export interface VirtualQueryObject<W, A, K, T> extends VirtualQuery<W, T> {
  select: (Alias<K, A> | K)[] | (keyof T)[];
}

export interface VirtualQueryValue<W, K, T> extends VirtualQuery<W, T> {
  select: K;
}

export interface VirtualQuerySelector<W, K, T> extends VirtualQuery<W, T> {
  select: (selector: TableObject<K>) => JsonValue;
}

export interface CountQuery<W> {
  where?: W;
  distinct?: boolean;
}

export interface ComplexQuery<W, T> extends Keywords<T> {
  where?: W;
  select: undefined;
}

export interface ComplexQueryObject<W, A, K, T> extends Keywords<T & Record<A, null>> {
  where?: W;
  select: (Alias<K, A> | K)[] | (keyof T)[];
}

export interface ComplexQueryValue<W, K, T> extends Keywords<T> {
  where?: W;
  select: K;
}

export interface ComplexQuerySelector<W, K, T> extends Keywords<T> {
  where?: W;
  select: (selector: TableObject<K>) => JsonValue;
}

export interface VirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[]): Promise<(Pick<T, K> & Record<A, JsonValue>) | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, column: (selector: TableObject<K>) => JsonValue): Promise<JsonValue | undefined>;
  get(query: HighlightQuery<W, T>): Promise<{ id: number, highlight: string } | undefined>;
  get(query: SnippetQuery<W, T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W | null): Promise<Array<T>>;
  many<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[]): Promise<Array<(Pick<T, K> & Record<A, JsonValue>)>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, column: (selector: TableObject<K>) => JsonValue): Promise<Array<JsonValue>>;
  query<K extends keyof T, A extends string>(query: VirtualQueryObject<W, A, K, T>): Promise<Array<(Pick<T, K> & Record<A, JsonValue>)>>;
  query<K extends keyof T>(query: VirtualQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query(query: VirtualQuery<W, T>): Promise<Array<T>>; 
  query<K extends keyof T>(query: VirtualQuerySelector<W, K, T>): Promise<Array<JsonValue>>;
  query(query: HighlightQuery<W, T>): Promise<Array<{ id: number, highlight: string }>>;
  query(query: SnippetQuery<W, T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface Queries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[]): Promise<(Pick<T, K> & Record<A, JsonValue>) | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, column: (selector: TableObject<K>) => JsonValue): Promise<JsonValue | undefined>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[]): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: JsonValue }, A>)>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, column: (selector: TableObject<K>) => JsonValue): Promise<Array<JsonValue>>;
  query<K extends keyof T, A extends string>(query: ComplexQueryObject<W, A, K, T>): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: JsonValue }, A>)>>;
  query<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query(query: ComplexQuery<W, T>): Promise<Array<T>>;
  query<K extends keyof T>(query: ComplexQuerySelector<W, K, T>): Promise<Array<JsonValue>>;
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

interface WhereMethods<T> {
	not: (value: T | Array<T> | null) => [];
	gt: (value: T) => [];
	lt: (value: T) => [];
	lte: (value: T) => [];
	like: (pattern: string) => [];
	match: (pattern: string) => [];
	glob: (pattern: string) => [];
	range: (limits: Range<T>) => [];
	eq: (value: T) => [];
}

type WhereBuilder<T> = WhereMethods<T> & {
	[key in Exclude<string, keyof WhereMethods<T>>]: WhereBuilder<T>;
}

type JsonWhereFunction = (builder: WhereBuilder<string | number | boolean>) => [];
type WhereFunction<T> = (builder: WhereMethods<T>) => [];

type JsonValue = string | number | boolean | null;

type JsonArray = Array<Json>;

type JsonObject = {
  [key: string]: Json;
}

type Json = JsonValue | JsonObject | JsonArray;

type TableObject<T> = {
  [key in T]: Json;
}

type Selector<T> = (selector: TableObject<T>) => JsonValue;

type Alias<T, R> = {
  select: Selector<T>,
  as: R
}
