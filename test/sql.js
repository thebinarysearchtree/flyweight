import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const locations = await db.locations.byMethod({ id: 1 });
  const record = await db.fights.byFighter({ id: 342 });
  const common = await db.fighters.common({ fighter1: 17, fighter2: 2624 });
  const methods = await db.methods.byFighter({ fighterId: 17 });
  const submission = await db.method.topSubmission();
  const winners = await db.locations.winners();

  compare(locations, 'locationsByMethod');
  compare(record, 'fightsByFighter');
  compare(common, 'fightersCommon');
  compare(methods, 'methodsByFighter');
  compare(winners, 'locationWinners');

  assert.equal(submission, 'Rear-naked choke');
}

export default {
  name: 'sql',
  run
};
