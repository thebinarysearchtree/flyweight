export interface WeightClass {
  id: number;
  name: string;
  weightLbs: number;
  gender: string;
}

export interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  long: number;
}

export interface LocationsByMethod {
  id: number;
  name: string;
  count: number;
}

export interface LocationsQueries {
  byMethod(params: any): Promise<Array<LocationsByMethod>>;
}

export interface LocationQueries {
  byMethod(params: any): Promise<LocationsByMethod>;
}

export interface Event {
  id: number;
  name: string;
  startTime: Date;
  locationId: number | null;
}

export interface EventsGetById {
  id: number;
  name: string;
  cards: Array<{
    id: number;
    cardName: string;
    fights: Array<{
      id: number;
      blue: { id: number; name: string; social: any };
      red: { id: number; name: string; social: any };
    }>;
  }>;
}

export interface EventsQueries {
  getById(params: any): Promise<Array<EventsGetById>>;
}

export interface EventQueries {
  getById(params: any): Promise<EventsGetById>;
}

export interface Card {
  id: number;
  eventId: number;
  cardName: string;
  cardOrder: number;
  startTime: Date | null;
}

export interface Coach {
  id: number;
  name: string;
  city: string;
  fightStyleId: number;
}

export interface Fighter {
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

export interface FightersCommon {
  red: { id: number; name: string };
  blue: { id: number; name: string };
  winnerId: number | null;
  method: string;
  description: string | null;
  event: { id: number; name: string; date: Date };
}

export interface FightersMethods {
  method: string;
  count: number;
}

export interface FightersQueries {
  common(params: any): Promise<Array<FightersCommon>>;
  methods(params: any): Promise<Array<FightersMethods>>;
}

export interface FighterQueries {
  common(params: any): Promise<FightersCommon>;
  methods(params: any): Promise<FightersMethods>;
}

export interface OtherName {
  id: number;
  fighterId: number;
  name: string;
}

export interface FighterCoach {
  id: number;
  coachId: number;
  fighterId: number;
  startDate: string;
  endDate: string | null;
}

export interface Ranking {
  id: number;
  fighterId: number;
  weightClassId: number;
  rank: number;
  isInterim: boolean;
}

export interface Method {
  id: number;
  name: string;
  abbreviation: string;
}

export interface MethodsByFighter {
  method: string;
  count: number;
}

export interface MethodsQueries {
  byFighter(params: any): Promise<Array<MethodsByFighter>>;
}

export interface MethodQueries {
  byFighter(params: any): Promise<MethodsByFighter>;
}

export interface Fight {
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
  missedWeightBlue: boolean;
  missedWeightRed: boolean;
  oddsBlue: number | null;
  oddsRed: number | null;
  catchweightLbs: number | null;
}

export interface FightsByFighter {
  opponent: string;
  win: boolean;
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

export interface FightsQueries {
  byFighter(params: any): Promise<Array<FightsByFighter>>;
}

export interface FightQueries {
  byFighter(params: any): Promise<FightsByFighter>;
}

export interface CancelledFight {
  id: number;
  cardId: number;
  cardOrder: number;
  blueId: number;
  redId: number;
  cancelledAt: Date;
  cancellationReason: string | null;
}

export interface TitleRemoval {
  id: number;
  fighterId: number;
  weightClassId: number;
  isInterim: boolean;
  removedAt: Date;
  reason: string;
}

export interface Keywords<T> {
  select: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithExclude<T> {
  exclude: T;
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithoutSelect {
  orderBy?: Array<string> | string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export interface KeywordsWithCount {
  distinct?: boolean;
  count: true;
}

export type RequiredParams<T> = Partial<Record<keyof T, any>>;

export type Params<T> = null | Partial<Record<keyof T, any>>;

export interface SingularQueries<T> {
  insert(params: T): Promise<any>;
  update(params: RequiredParams<T>, query?: Params<T>): Promise<number>;
  get(params?: Params<T>): Promise<T | null>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<T[K] | null>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<T | null>;
  get(params: Params<T>, keywords: KeywordsWithCount): Promise<number>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<T[K] | null>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | null>;
  remove(params?: Params<T>): Promise<number>;
}

export interface MultipleQueries<T> {
  insert(params: Array<T>): Promise<void>;
  update(params: RequiredParams<T>, query?: Params<T>): Promise<number>;
  get(params?: any): Promise<Array<T>>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<Array<T[K]>>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<Array<T[K]>>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  remove(params?: Params<T>): Promise<number>;
}

export interface TypedDb {
  weightClasses: MultipleQueries<WeightClass>,
  weightClass: SingularQueries<WeightClass>,
  locations: MultipleQueries<Location> & LocationsQueries,
  location: SingularQueries<Location> & LocationQueries,
  events: MultipleQueries<Event> & EventsQueries,
  event: SingularQueries<Event> & EventQueries,
  cards: MultipleQueries<Card>,
  card: SingularQueries<Card>,
  coaches: MultipleQueries<Coach>,
  coach: SingularQueries<Coach>,
  fighters: MultipleQueries<Fighter> & FightersQueries,
  fighter: SingularQueries<Fighter> & FighterQueries,
  otherNames: MultipleQueries<OtherName>,
  otherName: SingularQueries<OtherName>,
  fighterCoaches: MultipleQueries<FighterCoach>,
  fighterCoach: SingularQueries<FighterCoach>,
  rankings: MultipleQueries<Ranking>,
  ranking: SingularQueries<Ranking>,
  methods: MultipleQueries<Method> & MethodsQueries,
  method: SingularQueries<Method> & MethodQueries,
  fights: MultipleQueries<Fight> & FightsQueries,
  fight: SingularQueries<Fight> & FightQueries,
  cancelledFights: MultipleQueries<CancelledFight>,
  cancelledFight: SingularQueries<CancelledFight>,
  titleRemovals: MultipleQueries<TitleRemoval>,
  titleRemoval: SingularQueries<TitleRemoval>
}

declare const db: TypedDb;

export default db;
