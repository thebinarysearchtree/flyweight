interface QueryOptions {
  parse: boolean;
}

interface DatabaseConfig {
  debug?: boolean;
}

interface SQLiteConfig extends DatabaseConfig {
  db: string | URL;
  sql: string | URL;
  tables: string | URL;
  views: string | URL;
  extensions?: string | URL | Array<string | URL>;
  adaptor: any;
}

interface TursoConfig extends DatabaseConfig {
  db: any;
  files: any;
}

interface D1Config extends DatabaseConfig {
  db: any;
  files: any;
}

interface FileSystem {
  readFile: (path: string, encoding: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  join: (...paths: string[]) => string;
  readSql: (path: string) => Promise<string>;
}

interface Paths {
  tables: string;
  views: string;
  sql: string;
  types: string;
  migrations: string;
  wrangler?: string;
  files?: string;
}

declare class Database {
  constructor(options: DatabaseOptions);
  runMigration(sql: string): Promise<void>;
  makeTypes(fileSystem: FileSystem, paths: Paths): Promise<void>;
  getClient(): TypedDb; 
  getTables(): Promise<string>;
  createMigration(fileSystem: FileSystem, paths: Paths, name: string, reset?: boolean): Promise<string>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
}

declare class SQLiteDatabase extends Database {
  constructor(options: SQLiteConfig);
  close(): Promise<void>;
}

declare class TursoDatabase extends Database {
  constructor(options: TursoConfig);
  batch(handler: (batcher: any) => any[]): Promise<any[]>;
}

declare class D1Database extends Database {
  constructor(options: D1Config);
  batch(handler: (batcher: any) => any[]): Promise<any[]>;
}

declare class Modifier {
  constructor(name: string, value: any, operator: string);
  name: string;
  value: any;
  operator: string
}

declare function not(value: any): Modifier | undefined;
declare function gt(value: any): Modifier | undefined;
declare function gte(value: any): Modifier | undefined;
declare function lt(value: any): Modifier | undefined;
declare function lte(value: any): Modifier | undefined;
declare function like(value: any): Modifier | undefined;
declare function match(value: any): Modifier | undefined;
declare function glob(value: any): Modifier | undefined;

type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
};



interface Keywords<T> {
  select: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface KeywordsWithExclude<T> {
  exclude: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface KeywordsWithoutSelect {
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

interface VirtualKeywordsSelect<T, K> {
  select: K;
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  limit?: number;
  offset?: number;
}

interface VirtualKeywordsHighlight<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  highlight: { column: keyof T, tags: [string, string] };
  limit?: number;
  offset?: number;
}

interface VirtualKeywordsSnippet<T> {
  rank?: true;
  bm25?: Record<keyof Omit<T, "rowid">, number>;
  snippet: { column: keyof T, tags: [string, string], trailing: string, tokens: number };
  limit?: number;
  offset?: number;
}

interface VirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Pick<T, K> | undefined>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Array<Pick<T, K>>>;
  many(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  many(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

interface Queries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get(params: W | null, keywords: KeywordsWithoutSelect): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K>): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K[]>): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | undefined>;
  many(params?: W): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  many(params: W | null, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, keywords: Keywords<K>): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  count(params: W | null, keywords?: { distinct: true }): Promise<number>;
  exists(params: W | null): Promise<boolean>;
  remove(params?: W): Promise<number>;
}

interface WeightClasses {
  id: number;
  name: string;
  weightLbs: number;
  gender: string;
}

interface InsertWeightClasses {
  id?: number;
  name: string;
  weightLbs: number;
  gender: string;
}

interface WhereWeightClasses {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  weightLbs?: number | Array<number>;
  gender?: string | Array<string> | RegExp;
}

interface Locations {
  id: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

interface InsertLocations {
  id?: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

interface WhereLocations {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  address?: string | Array<string> | RegExp;
  lat?: number | Array<number>;
  long?: number | Array<number>;
}

interface LocationsById {
  id: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

interface LocationsByMethod {
  id: number;
  name: string;
  count: number;
}

interface LocationsDetailedEvents {
  name: string;
  events: Array<{ id: number, name: string }>;
}

interface LocationsEvents {
  name: string;
  events: Array<string>;
}

interface LocationsWinners {
  location: string;
  fighter: string;
  wins: number;
}

interface LocationsQueries {
  byId(params: { id: any; }): Promise<Array<LocationsById>>;
  byMethod(params: { id: any; }): Promise<Array<LocationsByMethod>>;
  detailedEvents(): Promise<Array<LocationsDetailedEvents>>;
  events(): Promise<Array<LocationsEvents>>;
  winners(): Promise<Array<LocationsWinners>>;
}

interface Events {
  id: number;
  name: string;
  startTime: Date;
  locationId: number | null;
}

interface InsertEvents {
  id?: number;
  name: string;
  startTime: Date;
  locationId?: number;
}

interface WhereEvents {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  startTime?: Date | Array<Date> | RegExp;
  locationId?: number | Array<number> | null;
}

interface EventsLag {
  test1: number | null;
  test2: number | null;
  test3: number | null;
}

interface EventsSpaces {
  id: number;
  name: string;
  test: Array<{ id: number, name: string }>;
}

interface EventsTest {
  id: number;
  nest: { name: string, startTime: Date };
}

interface EventsQueries {
  from(): Promise<Array<number | null>>;
  lag(): Promise<Array<EventsLag>>;
  operator(): Promise<Array<number>>;
  spaces(): Promise<Array<EventsSpaces>>;
  test(): Promise<Array<EventsTest>>;
}

interface Cards {
  id: number;
  eventId: number;
  cardName: string;
  cardOrder: number;
  startTime: Date | null;
}

interface InsertCards {
  id?: number;
  eventId: number;
  cardName: string;
  cardOrder: number;
  startTime?: Date;
}

interface WhereCards {
  id?: number | Array<number>;
  eventId?: number | Array<number>;
  cardName?: string | Array<string> | RegExp;
  cardOrder?: number | Array<number>;
  startTime?: Date | Array<Date> | RegExp | null;
}

interface Coaches {
  id: number;
  name: string;
  city: string;
  profile: any;
}

interface InsertCoaches {
  id?: number;
  name: string;
  city: string;
  profile?: any;
}

interface WhereCoaches {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  city?: string | Array<string> | RegExp;
  profile?: any | Array<any> | RegExp | null;
}

interface CoachesQueries {
  from(): Promise<Array<number>>;
}

interface Fighters {
  id: number;
  name: string;
  nickname: string | null;
  born: string | null;
  heightCm: number | null;
  reachCm: number | null;
  hometown: string;
  social: any;
  isActive: boolean;
}

interface InsertFighters {
  id?: number;
  name: string;
  nickname?: string;
  born?: string;
  heightCm?: number;
  reachCm?: number;
  hometown: string;
  social?: any;
  isActive: boolean;
}

interface WhereFighters {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  nickname?: string | Array<string> | RegExp | null;
  born?: string | Array<string> | RegExp | null;
  heightCm?: number | Array<number> | null;
  reachCm?: number | Array<number> | null;
  hometown?: string | Array<string> | RegExp;
  social?: any | Array<any> | RegExp | null;
  isActive?: boolean | Array<boolean>;
}

interface FightersByHeight {
  name: string;
  heightCm: number | null;
  heightRank: number;
}

interface FightersCommon {
  red: { id: number, name: string };
  blue: { id: number, name: string };
  winnerId: number | null;
  method: string;
  description: string | null;
  event: { id: number, name: string, date: Date };
}

interface FightersFilter {
  name: string;
  reaches: string | null;
}

interface FightersLastFights {
  name: string;
  dates: Array<Date>;
}

interface FightersLeft {
  id: number;
  winnerId: number | null;
  winnerName: string | null;
}

interface FightersMethods {
  method: string;
  count: number;
}

interface FightersOpponents {
  opponentId: number;
  name: string;
}

interface FightersOtherNames {
  name: string;
  otherNames: Array<string>;
}

interface FightersRight {
  id: number;
  winnerId: number;
  winnerName: string;
}

interface FightersWeightClasses {
  name: string;
  weightClasses: Array<{ id: number, name: string, test: boolean, nest: { id: number, age: boolean } }>;
}

interface FightersWithReach {
  name: string;
  heightCm: number | null;
  reachCm: number | null;
  reaches: Array<number>;
}

interface FightersQueries {
  byHeight(): Promise<Array<FightersByHeight>>;
  common(params: { fighter1: any; fighter2: any; }): Promise<Array<FightersCommon>>;
  filter(): Promise<Array<FightersFilter>>;
  instagram(): Promise<Array<number | string | Buffer>>;
  lastFights(params: { id: any; }): Promise<Array<FightersLastFights>>;
  left(): Promise<Array<FightersLeft>>;
  methods(params: { id: any; }): Promise<Array<FightersMethods>>;
  opponents(): Promise<Array<FightersOpponents>>;
  otherNames(): Promise<Array<FightersOtherNames>>;
  right(): Promise<Array<FightersRight>>;
  weightClasses(params: { fighterId: any; }): Promise<Array<FightersWeightClasses>>;
  withReach(): Promise<Array<FightersWithReach>>;
}

interface OtherNames {
  id: number;
  fighterId: number;
  name: string;
}

interface InsertOtherNames {
  id?: number;
  fighterId: number;
  name: string;
}

interface WhereOtherNames {
  id?: number | Array<number>;
  fighterId?: number | Array<number>;
  name?: string | Array<string> | RegExp;
}

interface FighterCoaches {
  id: number;
  coachId: number;
  fighterId: number;
  startDate: string;
  endDate: string | null;
}

interface InsertFighterCoaches {
  id?: number;
  coachId: number;
  fighterId: number;
  startDate: string;
  endDate?: string;
}

interface WhereFighterCoaches {
  id?: number | Array<number>;
  coachId?: number | Array<number>;
  fighterId?: number | Array<number>;
  startDate?: string | Array<string> | RegExp;
  endDate?: string | Array<string> | RegExp | null;
}

interface Rankings {
  id: number;
  fighterId: number;
  weightClassId: number;
  rank: number;
  isInterim: boolean;
}

interface InsertRankings {
  id?: number;
  fighterId: number;
  weightClassId: number;
  rank: number;
  isInterim: boolean;
}

interface WhereRankings {
  id?: number | Array<number>;
  fighterId?: number | Array<number>;
  weightClassId?: number | Array<number>;
  rank?: number | Array<number>;
  isInterim?: boolean | Array<boolean>;
}

interface Methods {
  id: number;
  name: string;
  abbreviation: string;
}

interface InsertMethods {
  id?: number;
  name: string;
  abbreviation: string;
}

interface WhereMethods {
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  abbreviation?: string | Array<string> | RegExp;
}

interface MethodsByFighter {
  method: string;
  count: number;
}

interface MethodsCoach {
  fit: number | string | Buffer;
  test: any;
  tests: any;
  profile: any;
}

interface MethodsQueries {
  byFighter(params: { fighterId: any; }): Promise<Array<MethodsByFighter>>;
  coach(): Promise<Array<MethodsCoach>>;
  topSubmission(): Promise<Array<string | null>>;
}

interface Fights {
  id: number;
  cardId: number;
  fightOrder: number;
  blueId: number;
  redId: number;
  winnerId: number | null;
  methodId: number | null;
  methodDescription: string | null;
  endRound: number | null;
  endSeconds: number | null;
  titleFight: boolean;
  isInterim: boolean;
  weightClassId: number | null;
  oddsBlue: number | null;
  oddsRed: number | null;
  catchweightLbs: number | null;
}

interface InsertFights {
  id?: number;
  cardId: number;
  fightOrder: number;
  blueId: number;
  redId: number;
  winnerId?: number;
  methodId?: number;
  methodDescription?: string;
  endRound?: number;
  endSeconds?: number;
  titleFight: boolean;
  isInterim: boolean;
  weightClassId?: number;
  oddsBlue?: number;
  oddsRed?: number;
  catchweightLbs?: number;
}

interface WhereFights {
  id?: number | Array<number>;
  cardId?: number | Array<number>;
  fightOrder?: number | Array<number>;
  blueId?: number | Array<number>;
  redId?: number | Array<number>;
  winnerId?: number | Array<number> | null;
  methodId?: number | Array<number> | null;
  methodDescription?: string | Array<string> | RegExp | null;
  endRound?: number | Array<number> | null;
  endSeconds?: number | Array<number> | null;
  titleFight?: boolean | Array<boolean>;
  isInterim?: boolean | Array<boolean>;
  weightClassId?: number | Array<number> | null;
  oddsBlue?: number | Array<number> | null;
  oddsRed?: number | Array<number> | null;
  catchweightLbs?: number | Array<number> | null;
}

interface FightsByFighter {
  opponent: string;
  win: boolean | null;
  winnerId: number | null;
  method: string;
  methodDescription: string | null;
  eventName: string;
  startTime: Date;
  endRound: number | null;
  endSeconds: number | null;
  titleFight: boolean;
  name: string;
}

interface FightsQueries {
  byFighter(params: { id: any; }): Promise<Array<FightsByFighter>>;
}

interface CancelledFights {
  id: number;
  cardId: number;
  cardOrder: number;
  blueId: number;
  redId: number;
  cancelledAt: Date;
  cancellationReason: string | null;
}

interface InsertCancelledFights {
  id?: number;
  cardId: number;
  cardOrder: number;
  blueId: number;
  redId: number;
  cancelledAt: Date;
  cancellationReason?: string;
}

interface WhereCancelledFights {
  id?: number | Array<number>;
  cardId?: number | Array<number>;
  cardOrder?: number | Array<number>;
  blueId?: number | Array<number>;
  redId?: number | Array<number>;
  cancelledAt?: Date | Array<Date> | RegExp;
  cancellationReason?: string | Array<string> | RegExp | null;
}

interface TitleRemovals {
  id: number;
  fighterId: number;
  weightClassId: number;
  isInterim: boolean;
  removedAt: Date;
  reason: string;
}

interface InsertTitleRemovals {
  id?: number;
  fighterId: number;
  weightClassId: number;
  isInterim: boolean;
  removedAt: Date;
  reason: string;
}

interface WhereTitleRemovals {
  id?: number | Array<number>;
  fighterId?: number | Array<number>;
  weightClassId?: number | Array<number>;
  isInterim?: boolean | Array<boolean>;
  removedAt?: Date | Array<Date> | RegExp;
  reason?: string | Array<string> | RegExp;
}

interface FighterProfiles {
  rowid: number;
  name: string;
  hometown: string;
}

interface InsertFighterProfiles {
  rowid?: number;
  name: string;
  hometown: string;
}

interface WhereFighterProfiles {
  rowid?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  hometown?: string | Array<string> | RegExp;
  fighterProfiles?: string;
}

interface Opponents {
  fightId: number;
  startTime: Date;
  fighterId: number;
  opponentId: number;
  methodId: number | null;
}

interface InsertOpponents {
  fightId: number;
  startTime: Date;
  fighterId: number;
  opponentId: number;
  methodId?: number;
}

interface WhereOpponents {
  fightId?: number | Array<number>;
  startTime?: Date | Array<Date> | RegExp;
  fighterId?: number | Array<number>;
  opponentId?: number | Array<number>;
  methodId?: number | Array<number> | null;
}

interface TypedDb {
  [key: string]: any,
  weightClasses: Queries<WeightClasses, InsertWeightClasses, WhereWeightClasses, number>,
  locations: Queries<Locations, InsertLocations, WhereLocations, number> & LocationsQueries,
  events: Queries<Events, InsertEvents, WhereEvents, number> & EventsQueries,
  cards: Queries<Cards, InsertCards, WhereCards, number>,
  coaches: Queries<Coaches, InsertCoaches, WhereCoaches, number> & CoachesQueries,
  fighters: Queries<Fighters, InsertFighters, WhereFighters, number> & FightersQueries,
  otherNames: Queries<OtherNames, InsertOtherNames, WhereOtherNames, number>,
  fighterCoaches: Queries<FighterCoaches, InsertFighterCoaches, WhereFighterCoaches, number>,
  rankings: Queries<Rankings, InsertRankings, WhereRankings, number>,
  methods: Queries<Methods, InsertMethods, WhereMethods, number> & MethodsQueries,
  fights: Queries<Fights, InsertFights, WhereFights, number> & FightsQueries,
  cancelledFights: Queries<CancelledFights, InsertCancelledFights, WhereCancelledFights, number>,
  titleRemovals: Queries<TitleRemovals, InsertTitleRemovals, WhereTitleRemovals, number>,
  fighterProfiles: VirtualQueries<FighterProfiles, WhereFighterProfiles>,
  opponents: Pick<Queries<Opponents, InsertOpponents, WhereOpponents>, "get", "many">,
  begin(): Promise<void>,
  commit(): Promise<void>,
  rollback(): Promise<void>,
  getTransaction(): Promise<TypedDb>,
  release(transaction: TypedDb): void
}

declare const database: SQLiteDatabase;
declare const db: TypedDb;
export {
  database,
  db
}
