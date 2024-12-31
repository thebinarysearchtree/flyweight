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
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
}

declare class SQLiteDatabase extends Database {
  constructor(options: SQLiteConfig);
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

declare class TursoDatabase extends Database {
  constructor(options: TursoConfig);
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  batch(handler: (batcher: any) => any[]): Promise<any[]>;
  sync(): Promise<void>;
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

interface Range {
  gt?: string | number;
  gte?: string | number;
  lt?: string | number;
  lte?: string | number;
}

declare function range(range: Range): Modifier | undefined;

type Unwrap<T extends any[]> = {
  [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
};



interface Keywords {
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

interface VirtualKeywords<T> {
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
  get(params?: W | null, columns: null, keywords?: VirtualKeywords): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K, keywords?: VirtualKeywords<T>): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, column: K[], keywords?: VirtualKeywords<T>): Promise<Pick<T, K> | undefined>;
  get(params: W | null, columns: null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, columns: null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
  many(params?: W): Promise<Array<T>>;
  many(params?: W, columns: null, keywords?: VirtualKeywords): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: K[], keywords?: VirtualKeywords): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K, keywords?: VirtualKeywords): Promise<Array<T[K]>>;
  many(params: W | null, columns: null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  many(params: W | null, columns: null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

interface Queries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  insertMany(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get(params?: W | null, columns: null, keywords: Keywords): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, columns: K[], keywords?: Keywords): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, column: K, keywords?: Keywords): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, columns: null, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | undefined>;
  many(params?: W): Promise<Array<T>>;
  many(params?: W, columns: null, keywords: Keywords): Promise<Array<T>>;
  many<K extends keyof T>(params: W | null, columns: K[], keywords?: Keywords): Promise<Array<Pick<T, K>>>;
  many<K extends keyof T>(params: W | null, column: K, keywords?: Keywords): Promise<Array<T[K]>>;
  many<K extends keyof T>(params: W | null, columns: null, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  count(params: W | null, keywords?: { distinct: true }): Promise<number>;
  exists(params: W | null): Promise<boolean>;
  remove(params?: W): Promise<number>;
}


interface WeightClass {
  id: number;
  name: string;
  weightLbs: number;
  gender: string;
}

interface InsertWeightClass {
  id?: number;
  name: string;
  weightLbs: number;
  gender: string;
}

interface WhereWeightClass {
  id?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  weightLbs?: number | Array<number> | Modifier;
  gender?: string | Array<string> | Modifier;
}

interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

interface InsertLocation {
  id?: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

interface WhereLocation {
  id?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  address?: string | Array<string> | Modifier;
  lat?: number | Array<number> | Modifier;
  long?: number | Array<number> | Modifier;
}

interface LocationById {
  id: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

interface LocationByMethod {
  id: number;
  name: string;
  count: number;
}

interface LocationDetailedEvents {
  name: string;
  events: Array<{ id: number, name: string }>;
}

interface LocationEvents {
  name: string;
  events: Array<string>;
}

interface LocationWinners {
  location: string;
  fighter: string;
  wins: number;
}

interface LocationQueries {
  byId(params: { id: any; }): Promise<Array<LocationById>>;
  byMethod(params: { id: any; }): Promise<Array<LocationByMethod>>;
  detailedEvents(): Promise<Array<LocationDetailedEvents>>;
  events(): Promise<Array<LocationEvents>>;
  winners(): Promise<Array<LocationWinners>>;
}

interface Event {
  id: number;
  name: string;
  startTime: Date;
  locationId: number | null;
}

interface InsertEvent {
  id?: number;
  name: string;
  startTime: Date;
  locationId?: number;
}

interface WhereEvent {
  id?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  startTime?: Date | Array<Date> | Modifier;
  locationId?: number | Array<number> | Modifier | null;
}

interface EventLag {
  test1: number | null;
  test2: number | null;
  test3: number | null;
}

interface EventSpaces {
  id: number;
  name: string;
  test: Array<{ id: number, name: string }>;
}

interface EventTest {
  id: number;
  nest: { name: string, startTime: Date };
}

interface EventQueries {
  from(): Promise<Array<number | null>>;
  lag(): Promise<Array<EventLag>>;
  operator(): Promise<Array<number>>;
  spaces(): Promise<Array<EventSpaces>>;
  test(): Promise<Array<EventTest>>;
}

interface Card {
  id: number;
  eventId: number;
  cardName: string;
  cardOrder: number;
  startTime: Date | null;
}

interface InsertCard {
  id?: number;
  eventId: number;
  cardName: string;
  cardOrder: number;
  startTime?: Date;
}

interface WhereCard {
  id?: number | Array<number> | Modifier;
  eventId?: number | Array<number> | Modifier;
  cardName?: string | Array<string> | Modifier;
  cardOrder?: number | Array<number> | Modifier;
  startTime?: Date | Array<Date> | Modifier | null;
}

interface Coach {
  id: number;
  name: string;
  city: string;
  profile: any;
}

interface InsertCoach {
  id?: number;
  name: string;
  city: string;
  profile?: any;
}

interface WhereCoach {
  id?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  city?: string | Array<string> | Modifier;
  profile?: any | Array<any> | Modifier | null;
}

interface CoachQueries {
  from(): Promise<Array<number>>;
}

interface Fighter {
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

interface InsertFighter {
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

interface WhereFighter {
  id?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  nickname?: string | Array<string> | Modifier | null;
  born?: string | Array<string> | Modifier | null;
  heightCm?: number | Array<number> | Modifier | null;
  reachCm?: number | Array<number> | Modifier | null;
  hometown?: string | Array<string> | Modifier;
  social?: any | Array<any> | Modifier | null;
  isActive?: boolean | Array<boolean> | Modifier;
}

interface FighterByHeight {
  name: string;
  heightCm: number | null;
  heightRank: number;
}

interface FighterCommon {
  red: { id: number, name: string };
  blue: { id: number, name: string };
  winnerId: number | null;
  method: string;
  description: string | null;
  event: { id: number, name: string, date: Date };
}

interface FighterFilter {
  name: string;
  reaches: string | null;
}

interface FighterLastFights {
  name: string;
  dates: Array<Date>;
}

interface FighterLeft {
  id: number;
  winnerId: number | null;
  winnerName: string | null;
}

interface FighterMethods {
  method: string;
  count: number;
}

interface FighterOpponents {
  opponentId: number;
  name: string;
}

interface FighterOtherNames {
  name: string;
  otherNames: Array<string>;
}

interface FighterRight {
  id: number;
  winnerId: number;
  winnerName: string;
}

interface FighterWeightClasses {
  name: string;
  weightClasses: Array<{ id: number, name: string, test: boolean, nest: { id: number, age: boolean } }>;
}

interface FighterWithReach {
  name: string;
  heightCm: number | null;
  reachCm: number | null;
  reaches: Array<number>;
}

interface FighterQueries {
  byHeight(): Promise<Array<FighterByHeight>>;
  common(params: { fighter1: any; fighter2: any; }): Promise<Array<FighterCommon>>;
  filter(): Promise<Array<FighterFilter>>;
  instagram(): Promise<Array<number | string | Buffer>>;
  lastFights(params: { id: any; }): Promise<Array<FighterLastFights>>;
  left(): Promise<Array<FighterLeft>>;
  methods(params: { id: any; }): Promise<Array<FighterMethods>>;
  opponents(): Promise<Array<FighterOpponents>>;
  otherNames(): Promise<Array<FighterOtherNames>>;
  right(): Promise<Array<FighterRight>>;
  weightClasses(params: { fighterId: any; }): Promise<Array<FighterWeightClasses>>;
  withReach(): Promise<Array<FighterWithReach>>;
}

interface OtherName {
  id: number;
  fighterId: number;
  name: string;
}

interface InsertOtherName {
  id?: number;
  fighterId: number;
  name: string;
}

interface WhereOtherName {
  id?: number | Array<number> | Modifier;
  fighterId?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
}

interface FighterCoach {
  id: number;
  coachId: number;
  fighterId: number;
  startDate: string;
  endDate: string | null;
}

interface InsertFighterCoach {
  id?: number;
  coachId: number;
  fighterId: number;
  startDate: string;
  endDate?: string;
}

interface WhereFighterCoach {
  id?: number | Array<number> | Modifier;
  coachId?: number | Array<number> | Modifier;
  fighterId?: number | Array<number> | Modifier;
  startDate?: string | Array<string> | Modifier;
  endDate?: string | Array<string> | Modifier | null;
}

interface Ranking {
  id: number;
  fighterId: number;
  weightClassId: number;
  rank: number;
  isInterim: boolean;
}

interface InsertRanking {
  id?: number;
  fighterId: number;
  weightClassId: number;
  rank: number;
  isInterim: boolean;
}

interface WhereRanking {
  id?: number | Array<number> | Modifier;
  fighterId?: number | Array<number> | Modifier;
  weightClassId?: number | Array<number> | Modifier;
  rank?: number | Array<number> | Modifier;
  isInterim?: boolean | Array<boolean> | Modifier;
}

interface Method {
  id: number;
  name: string;
  abbreviation: string;
}

interface InsertMethod {
  id?: number;
  name: string;
  abbreviation: string;
}

interface WhereMethod {
  id?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  abbreviation?: string | Array<string> | Modifier;
}

interface MethodByFighter {
  method: string;
  count: number;
}

interface MethodCoach {
  fit: number | string | Buffer;
  test: any;
  tests: any;
  profile: any;
}

interface MethodQueries {
  byFighter(params: { fighterId: any; }): Promise<Array<MethodByFighter>>;
  coach(): Promise<Array<MethodCoach>>;
  topSubmission(): Promise<Array<string | null>>;
}

interface Fight {
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

interface InsertFight {
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

interface WhereFight {
  id?: number | Array<number> | Modifier;
  cardId?: number | Array<number> | Modifier;
  fightOrder?: number | Array<number> | Modifier;
  blueId?: number | Array<number> | Modifier;
  redId?: number | Array<number> | Modifier;
  winnerId?: number | Array<number> | Modifier | null;
  methodId?: number | Array<number> | Modifier | null;
  methodDescription?: string | Array<string> | Modifier | null;
  endRound?: number | Array<number> | Modifier | null;
  endSeconds?: number | Array<number> | Modifier | null;
  titleFight?: boolean | Array<boolean> | Modifier;
  isInterim?: boolean | Array<boolean> | Modifier;
  weightClassId?: number | Array<number> | Modifier | null;
  oddsBlue?: number | Array<number> | Modifier | null;
  oddsRed?: number | Array<number> | Modifier | null;
  catchweightLbs?: number | Array<number> | Modifier | null;
}

interface FightByFighter {
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

interface FightQueries {
  byFighter(params: { id: any; }): Promise<Array<FightByFighter>>;
}

interface CancelledFight {
  id: number;
  cardId: number;
  cardOrder: number;
  blueId: number;
  redId: number;
  cancelledAt: Date;
  cancellationReason: string | null;
}

interface InsertCancelledFight {
  id?: number;
  cardId: number;
  cardOrder: number;
  blueId: number;
  redId: number;
  cancelledAt: Date;
  cancellationReason?: string;
}

interface WhereCancelledFight {
  id?: number | Array<number> | Modifier;
  cardId?: number | Array<number> | Modifier;
  cardOrder?: number | Array<number> | Modifier;
  blueId?: number | Array<number> | Modifier;
  redId?: number | Array<number> | Modifier;
  cancelledAt?: Date | Array<Date> | Modifier;
  cancellationReason?: string | Array<string> | Modifier | null;
}

interface TitleRemoval {
  id: number;
  fighterId: number;
  weightClassId: number;
  isInterim: boolean;
  removedAt: Date;
  reason: string;
}

interface InsertTitleRemoval {
  id?: number;
  fighterId: number;
  weightClassId: number;
  isInterim: boolean;
  removedAt: Date;
  reason: string;
}

interface WhereTitleRemoval {
  id?: number | Array<number> | Modifier;
  fighterId?: number | Array<number> | Modifier;
  weightClassId?: number | Array<number> | Modifier;
  isInterim?: boolean | Array<boolean> | Modifier;
  removedAt?: Date | Array<Date> | Modifier;
  reason?: string | Array<string> | Modifier;
}

interface FighterProfile {
  rowid: number;
  name: string;
  hometown: string;
}

interface InsertFighterProfile {
  rowid?: number;
  name: string;
  hometown: string;
}

interface WhereFighterProfile {
  rowid?: number | Array<number> | Modifier;
  name?: string | Array<string> | Modifier;
  hometown?: string | Array<string> | Modifier;
  fighterProfiles?: string;
}

interface Opponent {
  fightId: number;
  startTime: Date;
  fighterId: number;
  opponentId: number;
  methodId: number | null;
}

interface InsertOpponent {
  fightId: number;
  startTime: Date;
  fighterId: number;
  opponentId: number;
  methodId?: number;
}

interface WhereOpponent {
  fightId?: number | Array<number> | Modifier;
  startTime?: Date | Array<Date> | Modifier;
  fighterId?: number | Array<number> | Modifier;
  opponentId?: number | Array<number> | Modifier;
  methodId?: number | Array<number> | Modifier | null;
}

interface TypedDb {
  [key: string]: any,
  weightClasses: Queries<WeightClass, InsertWeightClass, WhereWeightClass, number>,
  locations: Queries<Location, InsertLocation, WhereLocation, number> & LocationQueries,
  events: Queries<Event, InsertEvent, WhereEvent, number> & EventQueries,
  cards: Queries<Card, InsertCard, WhereCard, number>,
  coaches: Queries<Coach, InsertCoach, WhereCoach, number> & CoachQueries,
  fighters: Queries<Fighter, InsertFighter, WhereFighter, number> & FighterQueries,
  otherNames: Queries<OtherName, InsertOtherName, WhereOtherName, number>,
  fighterCoaches: Queries<FighterCoach, InsertFighterCoach, WhereFighterCoach, number>,
  rankings: Queries<Ranking, InsertRanking, WhereRanking, number>,
  methods: Queries<Method, InsertMethod, WhereMethod, number> & MethodQueries,
  fights: Queries<Fight, InsertFight, WhereFight, number> & FightQueries,
  cancelledFights: Queries<CancelledFight, InsertCancelledFight, WhereCancelledFight, number>,
  titleRemovals: Queries<TitleRemoval, InsertTitleRemoval, WhereTitleRemoval, number>,
  fighterProfiles: VirtualQueries<FighterProfile, WhereFighterProfile>,
  opponents: Pick<Queries<Opponent, InsertOpponent, WhereOpponent>, "get", "many">,
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
