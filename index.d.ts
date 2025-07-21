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
  bm25?: Partial<Record<keyof Omit<T, "rowid">, number>>;
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

interface ComplexQueryInclude<W, T, U extends ObjectFunction> extends Keywords<T, Array<keyof T> | keyof T> {
  where?: W;
  select?: undefined;
  include?: U;
}

interface ComplexSqlQueryIncludeParams<P, W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R> {
  params: P;
}

interface ComplexSqlQueryInclude<W, T, R extends ObjectFunction> extends ComplexQueryInclude<W, T, R> {
  params?: undefined;
}

interface ComplexSqlQueryIncludeParamsDebug<P, W, T, R extends ObjectFunction> extends ComplexSqlQueryIncludeParams<P, W, T, R> {
  debug: true;
}

interface ComplexSqlQueryIncludeDebug<W, T, R extends ObjectFunction> extends ComplexSqlQueryInclude<W, T, R> {
  debug: true;
}

interface ComplexQueryIncludeDebug<W, T, U extends ObjectFunction> extends ComplexQueryInclude<W, T, U> {
  debug: true;
}

interface ComplexQueryObjectInclude<W, K, T, U extends ObjectFunction> extends Keywords<T, keyof T | Array<keyof T>> {
  where?: W;
  select: (keyof T)[] | K[];
  include?: U;
}

interface ComplexSqlQueryObjectIncludeParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R> {
  params: P;
}

interface ComplexSqlQueryObjectInclude<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, R> {
  params?: undefined;
}

interface ComplexSqlQueryObjectIncludeParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeParams<P, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeDebug<W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectInclude<W, K, T, R> {
  debug: true;
}

interface ComplexQueryObjectIncludeDebug<W, K, T, U extends ObjectFunction> extends ComplexQueryObjectInclude<W, K, T, U> {
  debug: true;
}

interface ComplexQueryObjectIncludeOmit<W, K, T, U extends ObjectFunction> extends Keywords<T, keyof T | Array<keyof T>> {
  where?: W;
  select?: undefined;
  omit: (keyof T)[] | K[] | K;
  include?: U;
}

interface ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R> {
  params: P;
}

interface ComplexSqlQueryObjectIncludeOmit<W, K, T, R extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, R> {
  params?: undefined;
}

interface ComplexSqlQueryObjectIncludeOmitParamsDebug<P, W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmitParams<P, W, K, T, R> {
  debug: true;
}

interface ComplexSqlQueryObjectIncludeOmitDebug<W, K, T, R extends ObjectFunction> extends ComplexSqlQueryObjectIncludeOmit<W, K, T, R> {
  debug: true;
}

interface ComplexQueryObjectIncludeOmitDebug<W, K, T, U extends ObjectFunction> extends ComplexQueryObjectIncludeOmit<W, K, T, U> {
  debug: true;
}

interface ComplexQueryValue<W, K, T> extends Keywords<T, Array<keyof T> | keyof T> {
  where?: W;
  select: K;
  omit?: undefined;
  include?: undefined;
}

interface ComplexSqlQueryValueParams<P, W, K, T> extends ComplexQueryValue<W, K, T> {
  params: P;
}

interface ComplexSqlQueryValue<W, K, T> extends ComplexQueryValue<W, K, T> {
  params?: undefined;
}

interface ComplexSqlQueryValueParamsDebug<P, W, K, T> extends ComplexSqlQueryValueParams<P, W, K, T> {
  debug: true;
}

interface ComplexSqlQueryValueDebug<W, K, T> extends ComplexSqlQueryValue<W, K, T> {
  debug: true;
}

interface ComplexQueryValueDebug<W, K, T> extends ComplexQueryValue<W, K, T> {
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

interface AggregateMethods<T, W, K extends keyof T, Y> {
  count<A extends string, U extends Includes<Y, (Pick<T, K> & { count: number })>>(params?: GroupQueryCountStarColumn<A, T, W & ToWhere<{ count: number }>, K | 'count', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  count<A extends string, U extends Includes<Y, (Pick<T, K> & { count: number })>>(params?: GroupQueryCountStarDistinct<A, T, W & ToWhere<{ count: number }>, K | 'count', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  avg<A extends string, U extends Includes<Y, (Pick<T, K> & { avg: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'avg', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  avg<A extends string, U extends Includes<Y, (Pick<T, K> & { avg: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'avg', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  max<A extends string, U extends Includes<Y, (Pick<T, K> & { max: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'max', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  max<A extends string, U extends Includes<Y, (Pick<T, K> & { max: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'max', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  min<A extends string, U extends Includes<Y, (Pick<T, K> & { min: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'min', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  min<A extends string, U extends Includes<Y, (Pick<T, K> & { min: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'min', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  sum<A extends string, U extends Includes<Y, (Pick<T, K> & { sum: number })>>(params: GroupQueryAggregateColumn<A, T, W & ToWhere<{ avg: number }>, K | 'sum', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  sum<A extends string, U extends Includes<Y, (Pick<T, K> & { sum: number })>>(params: GroupQueryAggregateDistinct<A, T, W & ToWhere<{ avg: number }>, K | 'sum', U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: number }, U>>>;
  array<A extends string, S extends keyof T, U extends Includes<Y, Pick<T, K>>>(params: GroupArrayValue<A, W & ToWhere<{ sum: number }>, K, U, S>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: Array<T[S]> }, U>>>;
  array<A extends string, U extends Includes<Y, Pick<T, K>>>(params: GroupArray<A, W & ToWhere<{ sum: number }>, K, U>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: Array<T> }, U>>>;
  array<A extends string, S extends keyof T, U extends Includes<Y, Pick<T, K>>>(params: GroupArraySelect<A, W & ToWhere<{ sum: number }>, K, U, S>): Promise<Array<MergeIncludes<Pick<T, K> & { [key in A]: Array<Pick<T, S>> }, U>>>;
}

type IfOddArgs<T> = 
  [BooleanParam, T, T] | 
  [BooleanParam, T, BooleanParam, T, T] | 
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, T] | 
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, T] | 
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, T] |
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, T];

type IfEvenArgs<T> = 
  [BooleanParam, T] | 
  [BooleanParam, T, BooleanParam, T] | 
  [BooleanParam, T, BooleanParam, T, BooleanParam, T] | 
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T] | 
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T] |
  [BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T, BooleanParam, T];

interface ComputeMethods {
  abs(n: NumberParam): NumberResult;
  coalesce(a: StringResult, b: string): DbString;
  coalesce(a: NumberResult, b: number): DbNumber;
  coalesce(a: BooleanResult, b: boolean): DbBoolean;
  coalesce(a: DateResult, b: Date): DbDate;
  coalesce<T extends DbAny>(a: T, b: T, ...rest: T[]): T;
  coalesce(a: any, b: any, ...rest: any[]): AnyResult;
  concat(...args: any[]): DbString;
  concatWs(...args: any[]): DbString;
  format(format: StringParam, ...args: any[]): StringResult;
  glob(pattern: StringParam, value: StringParam): NumberResult;
  if<T extends DbTypes | DbAny>(...args: IfOddArgs<T>): ToDbType<T>;
  if<T extends DbTypes | DbAny>(...args: IfEvenArgs<T>): ToDbType<T | null>;
  if(...args: any[]): AnyResult;
  instr(a: StringBufferParam, b: StringBufferParam): NumberResult;
  length(value: any): NumberResult;
  lower<T extends StringResult>(value: T): T;
  lower(value: StringParam): StringResult;
  ltrim(value: StringParam, remove?: StringParam): StringResult;
  max(a: DbNumber, b: number): DbNumber;
  max<T extends DbAny>(a: T, b: T, ...rest: T[]): T;
  max(a: any, b: any, ...rest: any[]): AnyResult;
  min(a: DbNumber, b: number): DbNumber;
  min<T extends DbAny>(a: T, b: T, ...rest: T[]): T;
  min(a: any, b: any, ...rest: any[]): AnyResult;
  nullif<T extends DbAny>(a: T, b: any): T | DbNull;
  nullif(a: any, b: any): AnyResult;
  octetLength(value: any): NumberResult;
  replace(value: StringParam, occurances: StringParam, substitute: StringParam): StringResult;
  round(value: NumberParam, places?: NumberParam): NumberResult;
  rtrim(value: StringParam, remove?: StringParam): StringResult;
  sign(value: any): NumberResult;
  substring(value: StringParam, start: NumberParam, length?: NumberParam): StringResult;
  trim(value: StringParam, remove?: StringParam): StringResult;
  unhex(hex: StringParam, ignore?: StringParam): BufferResult;
  unicode(value: StringParam): NumberResult;
  upper<T extends StringResult>(value: T): T;
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
  ln(value: NumberParam): NumberResult;
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
  extract(json: JsonParam | any[], path: StringParam): ExtractResult;
  plus(...args: DbNumber[]): DbNumber;
  plus(...args: NumberParam[]): NumberResult;
  minus(...args: DbNumber[]): DbNumber;
  minus(...args: NumberParam[]): NumberResult;
  divide(...args: DbNumber[]): DbNumber;
  divide(...args: NumberParam[]): NumberResult;
  multiply(...args: DbNumber[]): DbNumber;
  multiply(...args: NumberParam[]): NumberResult;
  object<T extends { [key: string]: AllowedJson }>(select: T): ToJson<T>;
  arrayLength(param: JsonParam | any[]): NumberResult;
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
  T extends (infer U)[] ? ToJson<U>[] :
  T extends object ? InterfaceToJson<T> :
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
  ) : T;

type ToDbInterface<T> = {
  [K in keyof T]: ToDbType<T[K]>;
};

type ToJsType<T> =
  T extends DbNull ? null :
  T extends ComputedNull ? null :
  T extends (infer U)[] ? ToJsType<U>[] :
  T extends object
    ? {
        [K in keyof T]: ToJsType<T[K]>
      }
  : T extends DbNumber ? number :
    T extends PkNumber ? number :
    T extends ComputedNumber ? number :
    T extends DbString ? string :
    T extends PkString ? string :
    T extends ComputedString ? string :
    T extends DbDate ? Date :
    T extends PkDate ? Date :
    T extends ComputedDate ? Date :
    T extends DbBoolean ? boolean :
    T extends ComputedBoolean ? boolean :
    T extends DbJson ? Json :
    T extends ComputedJson ? Json :
    T extends DbBuffer ? Buffer :
    T extends PkBuffer ? Buffer :
    T extends ComputedBuffer ? Buffer :
    never;

interface LagOptions<T> {
  expression: T;
  offset?: number | DbNumber;
  otherwise?: T;
}

interface SymbolMethods {
  count(): DbNumber;
  count(column: AnyResult): DbNumber;
  count(options: WindowOptions & { distinct: AnyResult }): DbNumber;
  count(options: WindowOptions & { column: AnyResult }): DbNumber;
  min<T extends AnyParam>(column: T): T;
  min<T extends AnyParam>(options: WindowOptions & { distinct: T }): T;
  min<T extends AnyParam>(options: WindowOptions & { column: T }): T;
  max<T extends AnyParam>(column: T): T;
  max<T extends AnyParam>(options: WindowOptions & { distinct: T }): T;
  max<T extends AnyParam>(options: WindowOptions & { column: T }): T;
  avg<T extends NumberResult>(column: T): T;
  avg<T extends NumberResult>(options: WindowOptions & { distinct: T }): T;
  avg<T extends NumberResult>(options: WindowOptions & { column: T }): T;
  sum<T extends NumberResult>(column: T): T;
  sum<T extends NumberResult>(options: WindowOptions & { distinct: T }): T;
  sum<T extends NumberResult>(options: WindowOptions & { column: T }): T;
  rowNumber(options?: WindowOptions): DbNumber;
  rank(options?: WindowOptions): DbNumber;
  denseRank(options?: WindowOptions): DbNumber;
  percentRank(options?: WindowOptions): DbNumber;
  cumeDist(options?: WindowOptions): DbNumber;
  ntile(options: WindowOptions & { groups: number | DbNumber }): DbNumber;
  lag<T extends DbAny>(options: WindowOptions & LagOptions<T>): T;
  lead<T extends DbAny>(options: WindowOptions & LagOptions<T>): T;
  firstValue<T extends DbAny>(options: WindowOptions & { expression: T }): T;
  lastValue<T extends DbAny>(options: WindowOptions & { expression: T }): T;
  nthValue<T extends DbAny>(options: WindowOptions & { expression: T, row: number | DbNumber }): T;
  group<T extends AllowedJson>(options: WindowOptions & { select: T }): ToJson<T>[];
  group<T extends AllowedJson>(select: T): ToJson<T>[];
  group<T>(select: ToDbInterface<T>): ToJson<T>[];
  group<T extends AllowedJson>(key: DbString, value: T): Record<string, ToJson<T>>;
  group<T extends AllowedJson>(options: WindowOptions & { key: DbString, value: T }): Record<string, ToJson<T>>;
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

interface Queries<T, I, W, R, Y> {
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
  query(): Promise<Array<T>>;
  query<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<Array<T[K]>>;
  query<K extends keyof T>(query: ComplexQueryValueDebug<W, K, T>): Promise<DebugResult<Array<T[K]>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U>): Promise<Array<MergeIncludes<Pick<T, K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U>): Promise<DebugResult<Array<MergeIncludes<Pick<T, K>, U>>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U>): Promise<Array<MergeIncludes<Omit<T, K>, U>>>;
  query<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U>): Promise<DebugResult<Array<MergeIncludes<Omit<T, K>, U>>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U>): Promise<Array<MergeIncludes<T, U>>>;
  query<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U>): Promise<DebugResult<Array<MergeIncludes<T, U>>>>;
  first(): Promise<T | undefined>;
  first<K extends keyof T>(query: ComplexQueryValue<W, K, T>): Promise<T[K] | undefined>;
  first<K extends keyof T>(query: ComplexQueryValueDebug<W, K, T>): Promise<DebugResult<T[K] | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectInclude<W, K, T, U>): Promise<MergeIncludes<Pick<T, K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeDebug<W, K, T, U>): Promise<DebugResult<MergeIncludes<Pick<T, K>, U> | undefined>>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmit<W, K, T, U>): Promise<MergeIncludes<Omit<T, K>, U> | undefined>;
  first<K extends keyof T, U extends Includes<Y, T>>(query: ComplexQueryObjectIncludeOmitDebug<W, K, T, U>): Promise<DebugResult<MergeIncludes<Omit<T, K>, U> | undefined>>;
  first<U extends Includes<Y, T>>(query: ComplexQueryInclude<W, T, U>): Promise<MergeIncludes<T, U> | undefined>;
  first<U extends Includes<Y, T>>(query: ComplexQueryIncludeDebug<W, T, U>): Promise<DebugResult<MergeIncludes<T, U> | undefined>>;
  count<K extends keyof T>(query?: AggregateQuery<W, K>): Promise<number>;
  avg<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  max<K extends keyof T>(query: AggregateQuery<W, K>): Promise<T[K]>;
  min<K extends keyof T>(query: AggregateQuery<W, K>): Promise<T[K]>;
  sum<K extends keyof T>(query: AggregateQuery<W, K>): Promise<number>;
  exists(params: W | null): Promise<boolean>;
  groupBy<K extends keyof T>(columns: K | Array<K>): AggregateMethods<T, W, K, Y>;
  compute(properties: Compute<T>): void;
  remove(params?: W): Promise<number>;
}

type CompareMethods<T> = {
  not: (value: T | T[]) => symbol;
	gt: (value: NonNullable<T>) => symbol;
	lt: (value: NonNullable<T>) => symbol;
	lte: (value: NonNullable<T>) => symbol;
	like: (pattern: NonNullable<T>) => symbol;
	match: (pattern: NonNullable<T>) => symbol;
	glob: (pattern: NonNullable<T>) => symbol;
	eq: (value: T) => symbol;
}

type SymbolCompareMethods<T> = {
  not: (column: symbol, value: T) => DbBoolean;
	gt: (column: symbol, value: NonNullable<T>) => DbBoolean;
	lt: (column: symbol, value: NonNullable<T>) => DbBoolean;
	lte: (column: symbol, value: NonNullable<T>) => DbBoolean;
	like: (column: symbol, pattern: NonNullable<T>) => DbBoolean;
	match: (column: symbol, pattern: NonNullable<T>) => DbBoolean;
	glob: (column: symbol, pattern: NonNullable<T>) => DbBoolean;
	eq: (column: symbol, value: T) => DbBoolean;
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

type WhereField<T> = T | Array<NonNullable<T>> | WhereFunction<T> | null;

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

interface QueryOptions {
  parse: boolean;
}

interface DatabaseConfig {
  debug?: boolean;
}

interface SQLiteConfig extends DatabaseConfig {
  db: string | URL;
  driver: any;
  extensions?: string | URL | Array<string | URL>;
}

interface TursoConfig extends DatabaseConfig {
  db: any;
}

interface FileSystem {
  readFile: (path: string, encoding: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  join: (...paths: string[]) => string;
  readSql: (path: string) => Promise<string>;
}

declare const intPk1: unique symbol;
declare const intPk2: unique symbol;

type PkNumber = typeof intPk1 | typeof intPk2;

declare const intComp1: unique symbol;
declare const intComp2: unique symbol;

type ComputedNumber = typeof intComp1 | typeof intComp2;

declare const stringPk1: unique symbol;
declare const stringPk2: unique symbol;

type PkString = typeof stringPk1 | typeof stringPk2;

declare const stringComp1: unique symbol;
declare const stringComp2: unique symbol;

type ComputedString = typeof stringComp1 | typeof stringComp2;

declare const bufferPk1: unique symbol;
declare const bufferPk2: unique symbol;

type PkBuffer = typeof bufferPk1 | typeof bufferPk2;

declare const bufferComp1: unique symbol;
declare const bufferComp2: unique symbol;

type ComputedBuffer = typeof bufferComp1 | typeof bufferComp2;

declare const datePk1: unique symbol;
declare const datePk2: unique symbol;

type PkDate = typeof datePk1 | typeof datePk2;

declare const dateComp1: unique symbol;
declare const dateComp2: unique symbol;

type ComputedDate = typeof dateComp1 | typeof dateComp2;

declare const boolComp1: unique symbol;
declare const boolComp2: unique symbol;

type ComputedBoolean = typeof boolComp1 | typeof boolComp2;

declare const jsonComp1: unique symbol;
declare const jsonComp2: unique symbol;

type ComputedJson = typeof jsonComp1 | typeof jsonComp2;

declare const nullComp1: unique symbol;
declare const nullComp2: unique symbol;

type ComputedNull = typeof nullComp1 | typeof nullComp2;

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

type DbAny = ComputedBoolean | ComputedBuffer | ComputedDate | ComputedJson | ComputedNumber | ComputedString | PkNumber | PkDate | PkString | PkBuffer | DbNumber | DbString | DbBuffer | DbJson | DbDate | DbBoolean;
type AnyParam = DbAny | DbNull | ComputedNull;

type AllowedJson = ComputedBoolean | ComputedDate | ComputedJson | ComputedNumber | ComputedString | PkNumber | PkDate | PkString | DbNumber | DbString | DbJson | DbDate | DbBoolean | DbNull | { [key: string]: AllowedJson } | AllowedJson[];
type SelectType = AllowedJson | AllowedJson[] | SelectType[] | { [key: string | symbol]: AllowedJson };

type NumberParam = number | null | ComputedNumber | PkNumber | DbNumber | DbNull | ComputedNull;
type NumberResult = DbNumber | DbNull;

type StringParam = string | null | PkString | ComputedString | DbString | DbNull | ComputedNull;
type StringResult = DbString | DbNull;

type NumberBufferParam = number | Buffer | null | DbNumber | PkNumber | ComputedNumber | PkBuffer | ComputedBuffer | DbBuffer | DbNull | ComputedNull;
type StringBufferParam = string | Buffer | null | DbString | PkString | ComputedString | DbBuffer | DbNull | ComputedNull;

type AnyResult = DbString | DbNumber | DbDate | DbBoolean | DbJson | DbBuffer | DbNull;

type BufferResult = DbBuffer | DbNull;

type DateParam = number | string | null | DbNumber | DbString | DbDate | PkNumber | PkString | PkDate | ComputedDate | ComputedNumber | ComputedString | DbNull;
type DateResult = DbDate | DbNull;

type BooleanParam = boolean | DbBoolean | ComputedBoolean;
type BooleanResult = DbBoolean | DbNull;

type JsonParam = string | Buffer | null | DbString | DbBuffer | DbJson | DbNull;
type ExtractResult = DbString | DbNumber | DbNull;
type JsonResult = DbJson | DbNull;

type DbTypes = number | string | boolean | Date | Buffer | null;

declare const sym1: unique symbol;
type ForeignKeyAction = typeof sym1;

declare const sym2: unique symbol;
declare const sym3: unique symbol;
type DbIndex = typeof sym2 | typeof sym3;

declare const sym4: unique symbol;
declare const sym5: unique symbol;
type DbUnique = typeof sym4 | typeof sym5;

declare const sym6: unique symbol;
declare const sym7: unique symbol;
type DbPrimaryKey = typeof sym6 | typeof sym7;

type GetReturnType<T> =
  PkNumber extends T[keyof T] ? number :
  PkString extends T[keyof T] ? string :
  PkBuffer extends T[keyof T] ? Buffer :
  PkDate extends T[keyof T] ? Date :
  number;

type ClassFields<T extends new (...args: any[]) => any> = {
  [K in keyof InstanceType<T>]: InstanceType<T>[K];
};

type ExtractColumns<T> = {
  [K in keyof T as K extends string
    ? K extends `${infer First}${string}`
      ? First extends Lowercase<First>
        ? K
        : never
      : never
    : never]: T[K];
};

type PkType = PkNumber | PkString | PkDate | PkBuffer;

type ToInsert<T> = {
  [K in keyof T as T[K] extends PkType
    ? K
    : DbNull extends T[K]
      ? K
      : never]?: Exclude<T[K], DbNull>;
} & {
  [K in keyof T as T[K] extends PkType
    ? never
    : DbNull extends T[K]
      ? never
      : K]: T[K];
};

type ExcludeComputed<T> = {
  [K in keyof T as T[K] extends AnyResult | PkType ? K : never]: T[K]
};

type ToQuery<R, T> = Queries<ToJsType<T>, ToJsType<ToInsert<ExcludeComputed<T>>>, ToWhere<ToJsType<T>>, GetReturnType<T>, R>;

type ToVirtual<T> = VirtualQueries<ToJsType<T>, ToWhere<ToJsType<T>>>;

type MakeClient<T extends { [key: string]: abstract new (...args: any) => any }> = {
  [K in keyof T as K extends string
    ? `${Uncapitalize<K>}`
    : never]: K extends string ? (InstanceType<T[K]> extends { Virtual: boolean } ? ToVirtual<ExtractColumns<InstanceType<T[K]>> & { [P in Uncapitalize<K>]: DbString }> : ToQuery<MakeClient<T>, ExtractColumns<InstanceType<T[K]>>>) : never;
};

type MakeContext<T extends { [key: string]: abstract new (...args: any) => any }> = {
  [K in keyof T as K extends string
    ? `${Uncapitalize<K>}`
    : never]: ExtractColumns<InstanceType<T[K]>>;
};

type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
}

type QueryCompareTypes = Date | number | boolean | null | string | Buffer | symbol;

type SubqueryContext = 
  CompareMethods<QueryCompareTypes> &
  SymbolCompareMethods<QueryCompareTypes> &
  ComputeMethods &
  SymbolMethods &
  { use<T>(context: T): T }

type MakeOptional<T> = {
  [K in keyof T]: T[K] extends Array<infer U>
    ? Array<U | DbNull>
    : T[K] | DbNull;
};

interface QueryReturn {
  where?: any;
  join?: any;
  groupBy?: any;
  having?: any;
  orderBy?: any;
  desc?: any;
  offset?: any;
  limit?: any;
}

interface ObjectReturn<S> extends QueryReturn {
  select?: { [key: string | symbol]: S };
  distinct?: { [key: string | symbol]: S };
  optional?: { [key: string | symbol]: S };
}

interface TableReturn<S, D, O> extends QueryReturn {
  select?: ToDbInterface<S>;
  distinct?: ToDbInterface<D>;
  optional?: ToDbInterface<O>;
}

interface ValueReturn<S> extends QueryReturn {
  select?: S;
  distinct?: S;
  optional?: S;
}

type GetDefined<T> =
  (T extends { select: infer V }
    ? ToJsType<V> : never) |
  (T extends { distinct: infer V }
    ? ToJsType<V> : never) |
  (T extends { optional: infer V }
    ? V extends ToDbInterface<infer _>
      ? ToJsType<MakeOptional<NonNullable<V>>>
      : ToJsType<V> | null
    : never);

interface TypedDb<P, C> {
  exec(sql: string): Promise<void>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  pragma(sql: string): Promise<any[]>;
  deferForeignKeys(): Promise<void>;
  getTransaction(type?: ('read' | 'write' | 'deferred')): Promise<TypedDb<P, C> & C>;
  batch:<T extends any[]> (batcher: (bx: TypedDb<P, C>) => T) => Promise<Unwrap<T>>;
  sync(): Promise<void>;
  query<S extends SelectType, K extends ValueReturn<S>, T extends (context: SubqueryContext & C) => K>(expression: T): Promise<GetDefined<ReturnType<T>>[]>;
  query<S extends SelectType, K extends ObjectReturn<S>, T extends (context: SubqueryContext & C) => K>(expression: T): Promise<ToJsType<ReturnType<T>['select'] & ReturnType<T>['distinct'] & MakeOptional<NonNullable<ReturnType<T>['optional']>>>[]>;
  subquery<S extends SelectType, K extends ObjectReturn<S>, T extends (context: SubqueryContext & C) => K>(expression: T): ReturnType<T>['select'] & ReturnType<T>['distinct'] & MakeOptional<NonNullable<ReturnType<T>['optional']>>;
}

type ToComputed<T> =
  T extends DbString ? ComputedString :
  T extends DbBoolean ? ComputedBoolean :
  T extends DbDate ? ComputedDate :
  T extends DbNull ? ComputedNull :
  T extends DbJson ? ComputedJson :
  T extends DbNumber ? ComputedNumber :
  T extends boolean ? ComputedBoolean :
  T extends number ? ComputedNumber :
  T extends Date ? ComputedDate :
  T extends string ? ComputedString :
  T extends Buffer ? ComputedBuffer :
  T extends null ? ComputedNull :
  T;

export class Table {
  static OnDeleteNoAction: ForeignKeyAction;
  static OnDeleteRestrict: ForeignKeyAction;
  static OnDeleteSetNull: ForeignKeyAction;
  static OnDeleteSetDefault: ForeignKeyAction;
  static OnDeleteCascade: ForeignKeyAction;
  static OnUpdateNoAction: ForeignKeyAction;
  static OnUpdateRestrict: ForeignKeyAction;
  static OnUpdateSetNull: ForeignKeyAction;
  static OnUpdateSetDefault: ForeignKeyAction;
  static OnUpdateCascade: ForeignKeyAction;

  Int: DbNumber;
  Intp: PkNumber;
  Intx: DbNumber | DbNull;
  Intu: DbNumber;
  Real: DbNumber;
  Realp: PkNumber;
  Realx: DbNumber | DbNull;
  Realu: DbNumber;
  Text: DbString;
  Textp: PkString;
  Textx: DbString | DbNull;
  Textu: DbString;
  Blob: DbBuffer;
  Blobp: PkBuffer;
  Blobx: DbBuffer | DbNull;
  Blobu: DbBuffer;
  Json: DbJson;
  Jsonx: DbJson | DbNull;
  Jsonu: DbJson;
  Date: DbDate;
  Datep: PkDate;
  Datex: DbDate | DbNull;
  Dateu: DbDate;
  Bool: DbBoolean;
  Boolx: DbBoolean | DbNull;
  Boolu: DbBoolean;

  Now: DbDate;
  True: DbBoolean;
  False: DbBoolean;

  Index: DbIndex;
  Unique: DbUnique;
  PrimaryKey: DbPrimaryKey;

  Abs(n: NumberParam): ToComputed<NumberResult>;
  Coalesce(a: StringResult, b: string): ToComputed<DbString>;
  Coalesce(a: NumberResult, b: number): ToComputed<DbNumber>;
  Coalesce(a: BooleanResult, b: boolean): ToComputed<DbBoolean>;
  Coalesce(a: DateResult, b: Date): ToComputed<DbDate>;
  Coalesce<T extends DbAny>(a: T, b: T, ...rest: T[]): ToComputed<T>;
  Coalesce(a: any, b: any, ...rest: any[]): ToComputed<AnyResult>;
  Concat(...args: any[]): ToComputed<DbString>;
  ConcatWs(...args: any[]): ToComputed<DbString>;
  Format(format: StringParam, ...args: any[]): ToComputed<StringResult>;
  If<T extends DbTypes | DbAny>(...args: IfOddArgs<T>): ToComputed<ToDbType<T>>;
  If<T extends DbTypes | DbAny>(...args: IfEvenArgs<T>): ToComputed<ToDbType<T | null>>;
  If(...args: any[]): ToComputed<AnyResult>;
  Instr(a: StringBufferParam, b: StringBufferParam): ToComputed<NumberResult>;
  Length(value: any): ToComputed<NumberResult>;
  Lower<T extends StringResult>(value: T): ToComputed<T>;
  Lower(value: StringParam): ToComputed<StringResult>;
  Ltrim(value: StringParam, remove?: StringParam): ToComputed<StringResult>;
  Max(a: DbNumber, b: number): ToComputed<DbNumber>;
  Max<T extends DbAny>(a: T, b: T, ...rest: T[]): ToComputed<T>;
  Max(a: any, b: any, ...rest: any[]): ToComputed<AnyResult>;
  Min(a: DbNumber, b: number): ToComputed<DbNumber>;
  Min<T extends DbAny>(a: T, b: T, ...rest: T[]): ToComputed<T>;
  Min(a: any, b: any, ...rest: any[]): ToComputed<AnyResult>;
  Nullif<T extends DbAny>(a: T, b: any): ToComputed<T | DbNull>;
  Nullif(a: any, b: any): ToComputed<AnyResult>;
  OctetLength(value: any): ToComputed<NumberResult>;
  Replace(value: StringParam, occurances: StringParam, substitute: StringParam): ToComputed<StringResult>;
  Round(value: NumberParam, places?: NumberParam): ToComputed<NumberResult>;
  Rtrim(value: StringParam, remove?: StringParam): ToComputed<StringResult>;
  Sign(value: any): ToComputed<NumberResult>;
  Substring(value: StringParam, start: NumberParam, length?: NumberParam): ToComputed<StringResult>;
  Rrim(value: StringParam, remove?: StringParam): ToComputed<StringResult>;
  Unhex(hex: StringParam, ignore?: StringParam): ToComputed<BufferResult>;
  Unicode(value: StringParam): ToComputed<NumberResult>;
  Upper<T extends StringResult>(value: T): ToComputed<T>;
  Upper(value: StringParam): ToComputed<StringResult>;
  ToDate(time?: DateParam, ...modifers: StringParam[]): ToComputed<StringResult>;
  Time(time?: DateParam, ...modifers: StringParam[]): ToComputed<StringResult>;
  DateTime(time?: DateParam, ...modifers: StringParam[]): ToComputed<StringResult>;
  JulianDay(time?: DateParam, ...modifers: StringParam[]): ToComputed<StringResult>;
  UnixEpoch(time?: DateParam, ...modifers: StringParam[]): ToComputed<StringResult>;
  StrfTime(format: StringParam, time: DateParam, ...modifers: StringParam[]): ToComputed<StringResult>;
  TimeDiff(start: DateParam, end: DateParam): ToComputed<StringResult>;
  Acos(value: NumberParam): ToComputed<NumberResult>;
  Acosh(value: NumberParam): ToComputed<NumberResult>;
  Asin(value: NumberParam): ToComputed<NumberResult>;
  Asinh(value: NumberParam): ToComputed<NumberResult>;
  Atan(value: NumberParam): ToComputed<NumberResult>;
  Atan2(b: NumberParam, a: NumberParam): ToComputed<NumberResult>;
  Atanh(value: NumberParam): ToComputed<NumberResult>;
  Ceil(value: NumberParam): ToComputed<NumberResult>;
  Cos(value: NumberParam): ToComputed<NumberResult>;
  Cosh(value: NumberParam): ToComputed<NumberResult>;
  Degrees(value: NumberParam): ToComputed<NumberResult>;
  Exp(value: NumberParam): ToComputed<NumberResult>;
  Floor(value: NumberParam): ToComputed<NumberResult>;
  Ln(value: NumberParam): ToComputed<NumberResult>;
  Log(base: NumberParam, value: NumberParam): ToComputed<NumberResult>;
  Mod(value: NumberParam, divider: NumberParam): ToComputed<NumberResult>;
  Pi(): ToComputed<NumberResult>;
  Power(value: NumberParam, exponent: NumberParam): ToComputed<NumberResult>;
  Radians(value: NumberParam): ToComputed<NumberResult>;
  Sin(value: NumberParam): ToComputed<NumberResult>;
  Sinh(value: NumberParam): ToComputed<NumberResult>;
  Sqrt(value: NumberParam): ToComputed<NumberResult>;
  Tan(value: NumberParam): ToComputed<NumberResult>;
  Tanh(value: NumberParam): ToComputed<NumberResult>;
  Trunc(value: NumberParam): ToComputed<NumberResult>;
  ToJson(param: JsonParam | any[]): ToComputed<StringResult>;
  Extract(json: JsonParam | any[], path: StringParam): ToComputed<ExtractResult>;
  Object<T extends { [key: string]: AllowedJson }>(select: T): ToComputed<ToJson<T>>;
  ArrayLength(param: JsonParam | any[]): ToComputed<NumberResult>;

  Plus(...args: DbNumber[]): ToComputed<DbNumber>;
  Plus(...args: NumberParam[]): ToComputed<NumberResult>;
  Minus(...args: DbNumber[]): ToComputed<DbNumber>;
  Minus(...args: NumberParam[]): ToComputed<NumberResult>;
  Divide(...args: DbNumber[]): ToComputed<DbNumber>;
  Divide(...args: NumberParam[]): ToComputed<NumberResult>;
  Multiply(...args: DbNumber[]): ToComputed<DbNumber>;
  Multiply(...args: NumberParam[]): ToComputed<NumberResult>;

  Not: (column: symbol, value: QueryCompareTypes | QueryCompareTypes[]) => ToComputed<DbBoolean>;
	Gt: (column: symbol, value: QueryCompareTypes) => ToComputed<DbBoolean>;
	Lt: (column: symbol, value: QueryCompareTypes) => ToComputed<DbBoolean>;
	Lte: (column: symbol, value: QueryCompareTypes) => ToComputed<DbBoolean>;
	Like: (column: symbol, pattern: QueryCompareTypes) => ToComputed<DbBoolean>;
	Match: (column: symbol, pattern: QueryCompareTypes) => ToComputed<DbBoolean>;
	Glob: (column: symbol, pattern: QueryCompareTypes) => ToComputed<DbBoolean>;
	Eq: (column: symbol, value: QueryCompareTypes) => ToComputed<DbBoolean>;
}

export class Database {
  constructor();
  runMigration(sql: string): Promise<void>;
  getClient<T extends abstract new (...args: any[]) => any, C extends { [key: string]: T }>(classes: C): TypedDb<MakeClient<C>, MakeContext<C>> & MakeClient<C>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class SQLiteDatabase extends Database {
  constructor(options: SQLiteConfig);
  initialize(): Promise<void>;
  close(): Promise<void>;
}

export class TursoDatabase extends Database {
  constructor(options: TursoConfig);
  batch(handler: (batcher: any) => any[], type: 'read' | 'write'): Promise<any[]>;
}
