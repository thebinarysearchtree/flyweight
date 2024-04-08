interface QueryOptions {
  parse: boolean;
}

interface CustomType {
  name: string;
  valueTest?: (v: any) => boolean;
  makeConstraint?: (column: string) => string;
  dbToJs?: (v: any) => any;
  jsToDb?: (v: any) => any;
  tsType?: string;
  dbType: string;
}

interface Paths {
  db: string | URL;
  sql?: string | URL;
  tables: string | URL;
  views?: string | URL;
  types?: string | URL;
  migrations?: string | URL;
  extensions?: string | URL | Array<string | URL>;
}

interface Initialize<T> {
  db: T;
  makeTypes(): Promise<void>;
  getTables(): Promise<string>;
  createMigration(name: string): Promise<{ sql: string, undo: () => Promise<void>}>;
  runMigration(name: string): Promise<void>;
}

declare class Database {
  constructor(options?: { debug?: boolean });
  initialize<T>(paths: Paths): Promise<Initialize<T>>;
  registerTypes(customTypes: Array<CustomType>): void;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(args: { query: any, params?: any }): Promise<number>;
  all<T>(args: { query: any, params?: any, options?: QueryOptions }): Promise<Array<T>>;
  exec(query: string): Promise<void>;
  close(): Promise<void>;
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

interface SingularVirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Pick<T, K> | undefined>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<{ id: number, highlight: string } | undefined>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<{ id: number, snippet: string } | undefined>;
}

interface MultipleVirtualQueries<T, W> {
  [key: string]: any;
  get(params?: W): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: W | null, keywords: VirtualKeywordsSelect<T, K[]>): Promise<Array<Pick<T, K>>>;
  get(params: W | null, keywords: VirtualKeywordsHighlight<T>): Promise<Array<{ id: number, highlight: string }>>;
  get(params: W | null, keywords: VirtualKeywordsSnippet<T>): Promise<Array<{ id: number, snippet: string }>>;
}

interface SingularQueries<T, I, W, R> {
  [key: string]: any;
  insert(params: I): Promise<R>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W | null): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, column: K): Promise<T[K] | undefined>;
  get(params: W | null, keywords: KeywordsWithoutSelect): Promise<T | undefined>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K>): Promise<T[K] | undefined>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K[]>): Promise<Pick<T, K> | undefined>;
  get<K extends keyof T>(params: W | null, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | undefined>;
  exists(params: W | null): Promise<boolean>;
  remove(params?: W): Promise<number>;
}

interface MultipleQueries<T, I, W> {
  [key: string]: any;
  insert(params: Array<I>): Promise<void>;
  update(query: W | null, params: Partial<T>): Promise<number>;
  get(params?: W): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, column: K): Promise<Array<T[K]>>;
  get(params: W | null, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K>): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: W | null, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: W | null, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  count(params: W | null, keywords?: { distinct: true }): Promise<number>;
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
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  weightLbs?: number | Array<number>;
  gender?: string | Array<string> | RegExp;
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
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  address?: string | Array<string> | RegExp;
  lat?: number | Array<number>;
  long?: number | Array<number>;
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
  byMethod(params: { id: any; }): Promise<Array<LocationsByMethod>>;
  detailedEvents(): Promise<Array<LocationsDetailedEvents>>;
  events(): Promise<Array<LocationsEvents>>;
  winners(): Promise<Array<LocationsWinners>>;
}

interface LocationQueries {
  byMethod(params: { id: any; }): Promise<LocationsByMethod | undefined>;
  detailedEvents(): Promise<LocationsDetailedEvents | undefined>;
  events(): Promise<LocationsEvents | undefined>;
  winners(): Promise<LocationsWinners | undefined>;
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
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  startTime?: Date | Array<Date> | RegExp;
  locationId?: number | Array<number> | null;
}

interface EventsTest {
  id: number;
  nest: { name: string, startTime: Date };
}

interface EventsQueries {
  from(): Promise<Array<number | null>>;
  test(): Promise<Array<EventsTest>>;
}

interface EventQueries {
  from(): Promise<number | null | undefined>;
  test(): Promise<EventsTest | undefined>;
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
  id?: number | Array<number>;
  eventId?: number | Array<number>;
  cardName?: string | Array<string> | RegExp;
  cardOrder?: number | Array<number>;
  startTime?: Date | Array<Date> | RegExp | null;
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
  id?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  city?: string | Array<string> | RegExp;
  profile?: any | Array<any> | RegExp | null;
}

interface CoachesQueries {
  from(): Promise<Array<number>>;
}

interface CoachQueries {
  from(): Promise<number | undefined>;
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

interface FightersCommon {
  red: { id: number, name: string };
  blue: { id: number, name: string };
  winnerId: number | null;
  method: string;
  description: string | null;
  event: { id: number, name: string, date: Date };
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

interface FightersQueries {
  common(params: { fighter1: any; fighter2: any; }): Promise<Array<FightersCommon>>;
  instagram(): Promise<Array<number | string | Buffer>>;
  lastFights(params: { id: any; }): Promise<Array<FightersLastFights>>;
  left(): Promise<Array<FightersLeft>>;
  methods(params: { id: any; }): Promise<Array<FightersMethods>>;
  opponents(): Promise<Array<FightersOpponents>>;
  otherNames(): Promise<Array<FightersOtherNames>>;
  right(): Promise<Array<FightersRight>>;
  weightClasses(params: { fighterId: any; }): Promise<Array<FightersWeightClasses>>;
}

interface FighterQueries {
  common(params: { fighter1: any; fighter2: any; }): Promise<FightersCommon | undefined>;
  instagram(): Promise<number | string | Buffer | undefined>;
  lastFights(params: { id: any; }): Promise<FightersLastFights | undefined>;
  left(): Promise<FightersLeft | undefined>;
  methods(params: { id: any; }): Promise<FightersMethods | undefined>;
  opponents(): Promise<FightersOpponents | undefined>;
  otherNames(): Promise<FightersOtherNames | undefined>;
  right(): Promise<FightersRight | undefined>;
  weightClasses(params: { fighterId: any; }): Promise<FightersWeightClasses | undefined>;
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
  id?: number | Array<number>;
  fighterId?: number | Array<number>;
  name?: string | Array<string> | RegExp;
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
  id?: number | Array<number>;
  coachId?: number | Array<number>;
  fighterId?: number | Array<number>;
  startDate?: string | Array<string> | RegExp;
  endDate?: string | Array<string> | RegExp | null;
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
  id?: number | Array<number>;
  fighterId?: number | Array<number>;
  weightClassId?: number | Array<number>;
  rank?: number | Array<number>;
  isInterim?: boolean | Array<boolean>;
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

interface MethodQueries {
  byFighter(params: { fighterId: any; }): Promise<MethodsByFighter | undefined>;
  coach(): Promise<MethodsCoach | undefined>;
  topSubmission(): Promise<string | null | undefined>;
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

interface FightQueries {
  byFighter(params: { id: any; }): Promise<FightsByFighter | undefined>;
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
  id?: number | Array<number>;
  cardId?: number | Array<number>;
  cardOrder?: number | Array<number>;
  blueId?: number | Array<number>;
  redId?: number | Array<number>;
  cancelledAt?: Date | Array<Date> | RegExp;
  cancellationReason?: string | Array<string> | RegExp | null;
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
  id?: number | Array<number>;
  fighterId?: number | Array<number>;
  weightClassId?: number | Array<number>;
  isInterim?: boolean | Array<boolean>;
  removedAt?: Date | Array<Date> | RegExp;
  reason?: string | Array<string> | RegExp;
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
  rowid?: number | Array<number>;
  name?: string | Array<string> | RegExp;
  hometown?: string | Array<string> | RegExp;
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
  fightId?: number | Array<number>;
  startTime?: Date | Array<Date> | RegExp;
  fighterId?: number | Array<number>;
  opponentId?: number | Array<number>;
  methodId?: number | Array<number> | null;
}

interface TypedDb {
  [key: string]: any,
  weightClasses: MultipleQueries<WeightClass, InsertWeightClass, WhereWeightClass>,
  weightClass: SingularQueries<WeightClass, InsertWeightClass, WhereWeightClass, number>,
  locations: MultipleQueries<Location, InsertLocation, WhereLocation> & LocationsQueries,
  location: SingularQueries<Location, InsertLocation, WhereLocation, number> & LocationQueries,
  events: MultipleQueries<Event, InsertEvent, WhereEvent> & EventsQueries,
  event: SingularQueries<Event, InsertEvent, WhereEvent, number> & EventQueries,
  cards: MultipleQueries<Card, InsertCard, WhereCard>,
  card: SingularQueries<Card, InsertCard, WhereCard, number>,
  coaches: MultipleQueries<Coach, InsertCoach, WhereCoach> & CoachesQueries,
  coach: SingularQueries<Coach, InsertCoach, WhereCoach, number> & CoachQueries,
  fighters: MultipleQueries<Fighter, InsertFighter, WhereFighter> & FightersQueries,
  fighter: SingularQueries<Fighter, InsertFighter, WhereFighter, number> & FighterQueries,
  otherNames: MultipleQueries<OtherName, InsertOtherName, WhereOtherName>,
  otherName: SingularQueries<OtherName, InsertOtherName, WhereOtherName, number>,
  fighterCoaches: MultipleQueries<FighterCoach, InsertFighterCoach, WhereFighterCoach>,
  fighterCoach: SingularQueries<FighterCoach, InsertFighterCoach, WhereFighterCoach, number>,
  rankings: MultipleQueries<Ranking, InsertRanking, WhereRanking>,
  ranking: SingularQueries<Ranking, InsertRanking, WhereRanking, number>,
  methods: MultipleQueries<Method, InsertMethod, WhereMethod> & MethodsQueries,
  method: SingularQueries<Method, InsertMethod, WhereMethod, number> & MethodQueries,
  fights: MultipleQueries<Fight, InsertFight, WhereFight> & FightsQueries,
  fight: SingularQueries<Fight, InsertFight, WhereFight, number> & FightQueries,
  cancelledFights: MultipleQueries<CancelledFight, InsertCancelledFight, WhereCancelledFight>,
  cancelledFight: SingularQueries<CancelledFight, InsertCancelledFight, WhereCancelledFight, number>,
  titleRemovals: MultipleQueries<TitleRemoval, InsertTitleRemoval, WhereTitleRemoval>,
  titleRemoval: SingularQueries<TitleRemoval, InsertTitleRemoval, WhereTitleRemoval, number>,
  fighterProfiles: MultipleVirtualQueries<FighterProfile, WhereFighterProfile>,
  fighterProfile: SingularVirtualQueries<FighterProfile, WhereFighterProfile>,
  opponents: Pick<MultipleQueries<Opponent, InsertOpponent, WhereOpponent>, "get">,
  opponent: Pick<SingularQueries<Opponent, InsertOpponent, WhereOpponent, undefined>, "get">,
  begin(): Promise<void>,
  commit(): Promise<void>,
  rollback(): Promise<void>,
  getTransaction(): Promise<TypedDb>,
  release(transaction: TypedDb): void
}

declare const database: Database;
declare const db: TypedDb;
declare function makeTypes(): Promise<void>;
declare function getTables(): Promise<string>;
declare function createMigration(name: string): Promise<{ sql: string, undo: () => Promise<void>}>;
declare function runMigration(name: string): Promise<void>;
declare const sqlPath: string;

export {
  database,
  db,
  makeTypes,
  getTables,
  createMigration,
  runMigration,
  sqlPath
}
