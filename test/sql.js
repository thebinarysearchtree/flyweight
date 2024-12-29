import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const locations = await db.locations.byMethod({ id: 1 });
  const record = await db.fights.byFighter({ id: 342 });
  const common = await db.fighters.common({ fighter1: 17, fighter2: 2624 });
  const methods = await db.methods.byFighter({ fighterId: 17 });
  const result = await db.methods.topSubmission();
  const submission = result.at(0);
  const winners = await db.locations.winners();
  const orderBy = await db.locations.events();
  const detailedEvents = await db.locations.detailedEvents();
  await db.coaches.from();

  compare(locations, 'locationsByMethod');
  compare(record, 'fightsByFighter');
  compare(common, 'fightersCommon');
  compare(methods, 'methodsByFighter');
  compare(winners, 'locationWinners');
  compare(orderBy, 'aggregateOrderBy');
  compare(detailedEvents, 'detailedEvents');

  assert.equal(submission, 'Rear-naked choke');
}

export default {
  name: 'sql',
  run
};
