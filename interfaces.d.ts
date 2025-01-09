export interface Keywords {
  orderBy?: Array<string> | string;
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

export interface VirtualKeywordsHighlight<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  highlight: { column: keyof T, tags: [string, string] };
  limit?: number;
  offset?: number;
}

export interface VirtualKeywordsSnippet<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  snippet: { column: keyof T, tags: [string, string], trailing: string, tokens: number };
  limit?: number;
  offset?: number;
}

export interface CountQuery<W> {
  where?: W;
  distinct?: boolean;
}

export interface ComplexQuery<W> extends Keywords {
  where?: W;
}

export interface ComplexQueryObject<W, A, K, T> extends ComplexQuery<W> {
  select: (Alias<K, A> | K)[] | (keyof T)[];
}

export interface ComplexQueryValue<W, K> extends ComplexQuery<W> {
  select: (K | Selector<K>);
}

export interface ComplexQuerySelector<W, K> extends ComplexQuery<W> {
  select: (selector: TableProperty<K>) => JsonValue;
}

export interface VirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get(params: W | null, columns: null, keywords?: VirtualKeywords<T>): Promise<T | undefined>;
  get<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[], keywords?: Keywords): Promise<(Pick<T, K> & Record<A, any>) | undefined>;
  get<K extends keyof T, A extends string>(params: W | null, column: (K | Selector<K>), keywords?: VirtualKeywords): Promise<(T[K] & Record<{ [key: string]: any }, A>[A]) | undefined>;
  get<K extends keyof T>(params: W | null, column: Selector<K>, keywords?: VirtualKeywords): Promise<any | undefined>;
  get(params: W | null, columns: null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, columns: null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W): Promise<Array<T>>;
  many(params: W, columns: null, keywords?: VirtualKeywords<T>): Promise<Array<T>>;
  many<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[], keywords?: Keywords): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: any }, A>)>>;
  many<K extends keyof T>(params: W | null, column: K, keywords?: VirtualKeywords): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, column: Selector<K>, keywords?: VirtualKeywords): Promise<Array<any>>;
  many(params: W | null, columns: null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  many(params: W | null, columns: null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

export interface Queries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(query: ComplexQuery<T>): Promise<T | undefined>;
  get<K extends keyof T, A extends string>(query: ComplexQueryObject<W, A, K, T>): Promise<(Pick<T, K> & Record<A, JsonValue>) | undefined>;
  get<K extends keyof T>(query: ComplexQueryValue<W, K>): Promise<T[K] | undefined>;
  get<K extends keyof T>(query: ComplexQuerySelector<W, K>): Promise<JsonValue | undefined>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[]): Promise<(Pick<T, K> & Record<A, JsonValue>) | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, column: (selector: TableObject<K>) => JsonValue): Promise<JsonValue | undefined>;
  many(query: ComplexQuery<T>): Promise<Array<T>>;
  many<K extends keyof T, A extends string>(query: ComplexQueryObject<W, A, K, T>): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: JsonValue }, A>)>>;
  many<K extends keyof T>(query: ComplexQueryValue<W, K>): Promise<Array<T[K]>>;
  many<K extends keyof T, P>(query: ComplexQuerySelector<W, K, P>): Promise<Array<P>>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof T, A extends string>(params: W | null, columns: (Alias<K, A> | K)[] | (keyof T)[]): Promise<Array<(Pick<T, K> & Pick<{ [key: string]: JsonValue }, A>)>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, column: (selector: TableObject<K>) => JsonValue): Promise<Array<JsonValue>>;
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
