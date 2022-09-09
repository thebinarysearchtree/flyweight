export interface WeightClass {
  id: number | null;
  name: string;
  weightLbs: number;
  gender: string;
}

export interface Location {
  id: number | null;
  name: string;
  address: string;
  lat: undefined;
  long: undefined;
}

export interface Event {
  id: number | null;
  name: string;
  startTime: number;
  locationId: number | null;
}

interface EventsGetById {
  eventId: number;
  eventName: string;
  cards: Array<{
    cardId: number;
    cardName: string;
    fights: Array<{
      fightId: number;
      blue: { id: number; name: string; socialJson: string | null };
      red: { id: number; name: string; socialJson: string | null };
    }>;
  }>;
}

interface EventsQueries {
  getById: Promise<Array<EventsGetById>>;
}

export interface Card {
  id: number | null;
  eventId: number;
  cardName: string;
  cardOrder: number;
  startTime: number | null;
}

export interface Coach {
  id: number | null;
  name: string;
  city: string;
  fightStyleId: number;
}

export interface Fighter {
  id: number | null;
  name: string;
  nickname: string | null;
  born: string | null;
  heightCm: number | null;
  reachCm: number | null;
  hometown: string;
  social: string | null;
  isActive: number;
}

export interface OtherName {
  id: number | null;
  fighterId: number;
  name: string;
}

export interface FighterCoach {
  id: number | null;
  coachId: number;
  fighterId: number;
  startDate: string;
  endDate: string | null;
}

export interface Ranking {
  id: number | null;
  fighterId: number;
  weightClassId: number;
  rank: number;
  isInterim: number;
}

export interface Method {
  id: number | null;
  name: string;
  abbreviation: string;
}

export interface Fight {
  id: number | null;
  cardId: number;
  fightOrder: number;
  blueId: number;
  redId: number;
  winnerId: number | null;
  methodId: number | null;
  methodDescription: string | null;
  endRound: number | null;
  endSeconds: number | null;
  titleFight: number;
  isInterim: number;
  weightClassId: number | null;
  missedWeightBlue: number;
  missedWeightRed: number;
  oddsBlue: number | null;
  oddsRed: number | null;
  catchweightLbs: undefined | null;
}

export interface CancelledFight {
  id: number | null;
  cardId: number;
  cardOrder: number;
  blueId: number;
  redId: number;
  cancelledAt: number;
  cancellationReason: string | null;
}

export interface TitleRemoval {
  id: number | null;
  fighterId: number;
  weightClassId: number;
  isInterim: number;
  removedAt: number;
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

export interface BasicQueries<T> {
  insert(params: T): Promise<any>;
  insertMany(params: Array<T>): Promise<void>;
  update(params: RequiredParams<T>, query?: Params<T>): Promise<number>;
  get(params?: Params<T>): Promise<T | null>;
  get<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, column: K): Promise<T[K] | null>;
  get(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<T | null>;
  get(params: Params<T>, keywords: KeywordsWithCount): Promise<number>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<T[K] | null>;
  get<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Pick<T, K> | null>;
  get<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Omit<T, K> | null>;
  all(params?: any): Promise<Array<T>>;
  all<K extends keyof T>(params: Params<T>, columns: K[]): Promise<Array<Pick<T, K>>>;
  all<K extends keyof T>(params: Params<T>, column: K): Promise<Array<T[K]>>;
  all(params: Params<T>, keywords: KeywordsWithoutSelect): Promise<Array<T>>;
  all<K extends keyof T>(params: Params<T>, keywords: Keywords<K>): Promise<Array<T[K]>>;
  all<K extends keyof T>(params: Params<T>, keywords: Keywords<K[]>): Promise<Array<Pick<T, K>>>;
  all<K extends keyof T>(params: Params<T>, keywords: KeywordsWithExclude<K[]>): Promise<Array<Omit<T, K>>>;
  remove(params?: Params<T>): Promise<number>;
}
export interface TypedDb {
  weightClasses: BasicQueries<WeightClass>,
  locations: BasicQueries<Location>,
  events: BasicQueries<Event> & EventsQueries,
  cards: BasicQueries<Card>,
  coaches: BasicQueries<Coach>,
  fighters: BasicQueries<Fighter>,
  otherNames: BasicQueries<OtherName>,
  fighterCoaches: BasicQueries<FighterCoach>,
  rankings: BasicQueries<Ranking>,
  methods: BasicQueries<Method>,
  fights: BasicQueries<Fight>,
  cancelledFights: BasicQueries<CancelledFight>,
  titleRemovals: BasicQueries<TitleRemoval>
}
