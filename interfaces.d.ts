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
  T & { [K in keyof U]: ReturnType<U[K]> extends Promise<infer R> ? (R extends any[] ? R : R | null) : never;
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

interface ComplexQueryInclude<W, T, U extends ObjectFunction, C> extends Keywords<T & C, Array<keyof (T & C)> | keyof (T & C)> {
  where?: W;
  select?: undefined;
  include?: U;
}

interface ComplexSqlQueryIncludeParams<P, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params: P;
}

interface ComplexSqlQueryInclude<W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R, unknown> {
  params?: undefined;
}

interface ComplexSqlQueryIncludeParamsDebug<P, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeParams<P, W, T, R> {
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

interface ComplexSqlQueryObjectIncludeParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params: P;
}

interface ComplexSqlQueryObjectInclude<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R, unknown> {
  params?: undefined;
}

interface ComplexSqlQueryObjectIncludeParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParams<P, W, K, T, R> {
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

interface ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params: P;
}

interface ComplexSqlQueryObjectIncludeOmit<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R, unknown> {
  params?: undefined;
}

interface ComplexSqlQueryObjectIncludeOmitParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R> {
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

interface ComplexSqlQueryValueParams<P, W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params: P;
}

interface ComplexSqlQueryValue<W, K, T> extends ComplexQueryValue<W, K, T, unknown> {
  params?: undefined;
}

interface ComplexSqlQueryValueParamsDebug<P, W, K, T> extends ComplexSqlQueryValueParams<P, W, K, T> {
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

interface GroupQueryKeywords<W, K, U> {
  where?: W;
  orderBy?: K;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include?: U;
}

interface GroupQueryCountStarColumn<A extends string, T, W, K, U> extends GroupQueryKeywords<W, K, U> {
  column: {
    [key in A]: true | keyof T;
  }
}

interface GroupQueryCountStarDistinct<A extends string, T, W, K, U> extends GroupQueryKeywords<W, K, U> {
  distinct: {
    [key in A]: true | keyof T;
  }
}

interface GroupQueryAggregateColumn<A extends string, T, W, K, U> extends GroupQueryKeywords<W, K, U> {
  column: {
    [key in A]: keyof T;
  }
}

interface GroupQueryAggregateDistinct<A extends string, T, W, K, U> extends GroupQueryKeywords<W, K, U> {
  distinct: {
    [key in A]: keyof T;
  }
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
}

interface GroupArrayKeywords<W, K, U> {
  where?: W;
  orderBy?: K;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include?: U;
}

interface GroupArray<A extends string, W, K, U> extends GroupArrayKeywords<W, K, U> {
  select: {
    [key in A]: true;
  }
}

interface GroupArraySelect<A extends string, W, K, U, S> extends GroupArrayKeywords<W, K, U> {
  select: {
    [key in A]: S[];
  }
}

interface GroupArrayValue<A extends string, W, K, U, S> extends GroupArrayKeywords<W, K, U> {
  select: {
    [key in A]: S;
  }
}

interface AggregateMethods<T, W, C, K extends keyof (T & C), Y> {
  count<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { count: number })>>(params?: GroupQueryCountStarColumn<A, T, W & ToWhere<{ count: number }>, K | 'count', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  count<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { count: number })>>(params?: GroupQueryCountStarDistinct<A, T, W & ToWhere<{ count: number }>, K | 'count', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  avg<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { avg: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'avg', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  avg<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { avg: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'avg', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  max<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { max: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'max', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  max<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { max: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'max', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  min<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { min: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'min', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  min<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { min: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'min', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  sum<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { sum: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'sum', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  sum<A extends string, U extends Includes<Y, (Pick<(T & C), K> & { sum: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'sum', U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: number }, U>>>;
  array<A extends string, S extends keyof (T & C), U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArrayValue<A, W & ToWhere<{ sum: number }>, K, U, S>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: Array<(T & C)[S]> }, U>>>;
  array<A extends string, U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArray<A, W & ToWhere<{ sum: number }>, K, U>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: Array<T> }, U>>>;
  array<A extends string, S extends keyof (T & C), U extends Includes<Y, Pick<(T & C), K>>>(params: GroupArraySelect<A, W & ToWhere<{ sum: number }>, K, U, S>): Promise<Array<MergeIncludes<Pick<(T & C), K> & { [key in A]: Array<Pick<(T & C), S>> }, U>>>;
}

declare const dbNumber1: unique symbol;
declare const dbNumber2: unique symbol;

type DbNumber = typeof dbNumber1 | typeof dbNumber2;

declare const dbString1: unique symbol;
declare const dbString2: unique symbol;

type DbString = typeof dbString1 | typeof dbString2;

declare const dbBoolean1: unique symbol;
declare const dbBoolean2: unique symbol;

type DbBoolean = typeof dbBoolean1 | typeof dbBoolean2;

declare const dbDate1: unique symbol;
declare const dbDate2: unique symbol;

type DbDate = typeof dbDate1 | typeof dbDate2;

declare const dbJson1: unique symbol;
declare const dbJson2: unique symbol;

type DbJson = typeof dbJson1 | typeof dbJson2;

declare const dbBuffer1: unique symbol;
declare const dbBuffer2: unique symbol;

type DbBuffer = typeof dbBuffer1 | typeof dbBuffer2;

declare const dbNull1: unique symbol;
declare const dbNull2: unique symbol;

type DbNull = typeof dbNull1 | typeof dbNull2;

type DbAny = DbNumber | DbString | DbBuffer | DbJson | DbDate | DbBoolean;
type AnyParam = DbAny | DbNull;

type AllowedJson = DbNumber | DbString | DbJson | DbDate | DbBoolean | DbNull;

type NumberParam = number | null | DbNumber | DbNull;
type NumberResult = DbNumber | DbNull;

type StringParam = string | null | DbString | DbNull;
type StringResult = DbString | DbNull;

type NumberBufferParam = number | Buffer | null | DbNumber | DbBuffer | DbNull;
type StringBufferParam = string | Buffer | null | DbString | DbBuffer | DbNull;

type AnyResult = DbAny | DbNull;

type BufferResult = DbBuffer | DbNull;

type DateParam = number | string | null | DbNumber | DbString | DbDate | DbNull;
type DateResult = DbDate | DbNull;

type JsonParam = string | Buffer | null | DbString | DbBuffer | DbJson | DbNull;
type ExtractResult = DbString | DbNumber | DbNull;
type JsonResult = DbJson | DbNull;

interface ComputeMethods {
  abs(n: NumberParam): NumberResult;
  coalesce(a: any, b: any, ...rest: any[]): AnyResult;
  concat(...args: any[]): DbString;
  concatWs(...args: any[]): DbString;
  format(format: StringParam, ...args: any[]): StringResult;
  glob(pattern: StringParam, value: StringParam): NumberResult;
  hex(value: NumberBufferParam): StringResult;
  if(...args: any[]): AnyResult;
  instr(a: StringBufferParam, b: StringBufferParam): NumberResult;
  length(value: any): NumberResult;
  lower(value: StringParam): StringResult;
  ltrim(value: StringParam, remove?: StringParam): StringResult;
  max(a: any, b: any, ...rest: any[]): AnyResult;
  min(a: any, b: any, ...rest: any[]): AnyResult;
  nullif(a: any, b: any): AnyResult;
  octetLength(value: any): NumberResult;
  replace(value: any, occurances: any, substitute: any): StringResult;
  round(value: NumberParam, places?: NumberParam): NumberResult;
  rtrim(value: StringParam, remove?: StringParam): StringResult;
  sign(value: any): NumberResult;
  substring(value: StringParam, start: NumberParam, length?: NumberParam): StringResult;
  trim(value: StringParam, remove?: StringParam): StringResult;
  unhex(hex: StringParam, ignore?: StringParam): BufferResult;
  unicode(value: StringParam): NumberResult;
  upper(value: StringParam): StringResult;
  date(time?: DateParam, ...modifers: StringParam[]): StringResult;
  time(time?: DateParam, ...modifers: StringParam[]): StringResult;
  dateTime(time?: DateParam, ...modifers: StringParam[]): StringResult;
  julianDay(time?: DateParam, ...modifers: StringParam[]): StringResult;
  unixEpoch(time?: DateParam, ...modifers: StringParam[]): StringResult;
  strfTime(format: StringParam, time: DateParam, ...modifers: StringParam[]): StringResult;
  timeDiff(start: DateParam, end: DateParam): StringResult;
  acos(value: NumberParam): NumberResult;
  acosh(value: NumberParam): NumberResult;
  asin(value: NumberParam): NumberResult;
  asinh(value: NumberParam): NumberResult;
  atan(value: NumberParam): NumberResult;
  atan2(b: NumberParam, a: NumberParam): NumberResult;
  atanh(value: NumberParam): NumberResult;
  ceil(value: NumberParam): NumberResult;
  cos(value: NumberParam): NumberResult;
  cosh(value: NumberParam): NumberResult;
  degrees(value: NumberParam): NumberResult;
  exp(value: NumberParam): NumberResult;
  floor(value: NumberParam): NumberResult;
  ln(value: NumberParaml): NumberResult;
  log(base: NumberParam, value: NumberParam): NumberResult;
  mod(value: NumberParam, divider: NumberParam): NumberResult;
  pi(): NumberResult;
  power(value: NumberParam, exponent: NumberParam): NumberResult;
  radians(value: NumberParam): NumberResult;
  sin(value: NumberParam): NumberResult;
  sinh(value: NumberParam): NumberResult;
  sqrt(value: NumberParam): NumberResult;
  tan(value: NumberParam): NumberResult;
  tanh(value: NumberParam): NumberResult;
  trunc(value: NumberParam): NumberResult;
  json(param: JsonParam | any[]): StringResult;
  jsonExtract(json: JsonParam | any[], path: StringParam): ExtractResult;
  plus(...args: NumberParam[]): NumberResult;
  minus(...args: NumberParam[]): NumberResult;
  divide(...args: NumberParam[]): NumberResult;
  multiply(...args: NumberParam[]): NumberResult;
  jsonObject(select: { [key: string]: AnyParam }): JsonResult;
  jsonArrayLength(param: JsonParam | any[]): NumberResult;
}

interface FrameOptions {
  type: 'rows' | 'groups' | 'range';
  currentRow?: true;
  preceding?: 'unbounded' | number;
  following?: 'unbounded' | number;
}

interface WindowOptions {
  partitionBy?: symbol | symbol[];
  where?: { [key: symbol]: symbol };
  orderBy?: symbol | symbol[];
  desc?: true;
  frame?: FrameOptions;
}

type ToJson<T> =
  T extends DbDate ? DbString :
  T extends DbBoolean ? DbNumber :
  T;

type InterfaceToJson<T> = {
  [K in keyof T]: ToJson<T[K]>;
};

type ToDbType<T> =
  T extends null ? DbNull :
  T extends infer U ? (
    U extends number ? DbNumber :
    U extends string ? DbString :
    U extends Date ? DbDate :
    U extends boolean ? DbBoolean :
    U extends null ? DbNull :
    U extends Json ? DbJson :
    DbJson
  ) : never;

type ToDbInterface<T> = {
  [K in keyof T]: ToDbType<T[K]>;
};

interface SymbolMethods {
  count(): DbNumber;
  count(column: AnyResult): DbNumber;
  count(options: WindowOptions & { distinct: AnyResult }): DbNumber;
  count(options: WindowOptions & { column: AnyResult }): DbNumber;
  min<T extends symbol>(column: T): T;
  min<T extends symbol>(options: WindowOptions & { distinct: T }): T;
  min<T extends symbol>(options: WindowOptions & { column: T }): T;
  max<T extends symbol>(column: T): T;
  max<T extends symbol>(options: WindowOptions & { distinct: T }): T;
  max<T extends symbol>(options: WindowOptions & { column: T }): T;
  avg(column: NumberResult): NumberResult;
  avg(options: WindowOptions & { distinct: NumberResult }): NumberResult;
  avg(options: WindowOptions & { column: NumberResult }): NumberResult;
  sum(column: NumberResult): NumberResult;
  sum(options: WindowOptions & { distinct: NumberResult }): NumberResult;
  sum(options: WindowOptions & { column: NumberResult }): NumberResult;
  rowNumber(options?: WindowOptions): DbNumber;
  rank(options?: WindowOptions): DbNumber;
  denseRank(options?: WindowOptions): DbNumber;
  percentRank(options?: WindowOptions): DbNumber;
  cumeDist(options?: WindowOptions): DbNumber;
  ntile(options: WindowOptions & { groups: number }): DbNumber;
  jsonGroupArray<T extends AllowedJson>(select: T): ToJson<T>[];
  jsonGroupArray<T extends AllowedJson>(options: WindowOptions & { select: T }): ToJson<T>[];
  jsonGroupArray<T extends { [key: string]: AllowedJson }>(options: WindowOptions & { select: T }): InterfaceToJson<T>[];
  jsonGroupObject<T extends AllowedJson>(key: DbString, value: T): Record<string, ToJson<T>>;
  jsonGroupObject<T extends AllowedJson>(options: WindowOptions & { key: DbString, value: T }): Record<string, ToJson<T>>;
}

interface Compute<T> {
  [key: string]: (column: T, method: ComputeMethods) => void;
}

interface Tables {
  name: string;
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
  query(): Promise<Array<T>>;
  query<K extends keyof (T & C)>(query: ComplexQueryValue<W, K, T, C>): Promise<Array<(T & C)[K]>>;
  query<K extends keyof (T & C)>(query: ComplexQueryValueDebug<W, K, T, C>): Promise<DebugResult<Array<(T & C)[K]>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U, C>): Promise<Array<MergeIncludes<Pick<(T & C), K>, U>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U, C>): Promise<DebugResult<Array<MergeIncludes<Pick<(T & C), K>, U>>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U, C>): Promise<Array<MergeIncludes<Omit<T, K>, U>>>;
  query<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U, C>): Promise<DebugResult<Array<MergeIncludes<Omit<T, K>, U>>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U, C>): Promise<Array<MergeIncludes<T, U>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U, C>): Promise<DebugResult<Array<MergeIncludes<T, U>>>>;
  first(): Promise<T | undefined>;
  first<K extends keyof (T & C)>(query: ComplexQueryValue<W, K, T, C>): Promise<(T & C)[K] | undefined>;
  first<K extends keyof (T & C)>(query: ComplexQueryValueDebug<W, K, T, C>): Promise<DebugResult<(T & C)[K] | undefined>>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U, C>): Promise<MergeIncludes<Pick<(T & C), K>, U> | undefined>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U, C>): Promise<DebugResult<MergeIncludes<Pick<(T & C), K>, U> | undefined>>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U, C>): Promise<MergeIncludes<Omit<T, K>, U> | undefined>;
  first<K extends keyof (T & C), U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U, C>): Promise<DebugResult<MergeIncludes<Omit<T, K>, U> | undefined>>;
  first<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U, C>): Promise<MergeIncludes<(T & C), U> | undefined>;
  first<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U, C>): Promise<DebugResult<MergeIncludes<(T & C), U> | undefined>>;
  count<K extends keyof (T & C)>(query?: AggregateQuery<W, K>): Promise<number>;
  avg<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<number>;
  max<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<(T & C)[K]>;
  min<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<(T & C)[K]>;
  sum<K extends keyof (T & C)>(query: AggregateQuery<W, K>): Promise<number>;
  exists(params: W | null): Promise<boolean>;
  groupBy<K extends keyof (T & C)>(columns: K | Array<K>): AggregateMethods<T, W, C, K, Y>;
  compute(properties: Compute<T>): void;
  remove(params?: W): Promise<number>;
}

type CompareMethods<T> = {
  not: (value: T) => symbol;
	gt: (value: NonNullable<T>) => symbol;
	lt: (value: NonNullable<T>) => symbol;
	lte: (value: NonNullable<T>) => symbol;
	like: (pattern: NonNullable<T>) => symbol;
	match: (pattern: NonNullable<T>) => symbol;
	glob: (pattern: NonNullable<T>) => symbol;
	eq: (value: T) => symbol;
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

interface SqlQueryParams<P> {
  params: P;
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
