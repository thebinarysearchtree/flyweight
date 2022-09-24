import db from './db.js';
import { strict as assert } from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';

const compare = async (actual, result) => {
  const path = join('results', `${result}.json`);
  const url = new URL(path, import.meta.url);
  const expected = await readFile(url, 'utf8');
  assert.equal(JSON.stringify(actual), expected, result);
}

const event = await db.event.getById({ id: 100 });
const cards = await db.cards.get({ eventId: 100 });
const locations = await db.locations.byMethod({ id: 1 });
const record = await db.fights.byFighter({ id: 342 });
const common = await db.fighters.common({ fighter1: 17, fighter2: 2624 });
const methods = await db.methods.byFighter({ fighterId: 17 });
const fighterId = await db.fighter.get({ name: /Israel/ }, 'id');
const submission = await db.method.topSubmission();
const coach = await db.coach.get({ id: 1 });
if (coach) {
  await db.coach.remove({ id: 1 });
}

compare(event, 'eventGetById');
compare(cards, 'cardsGet');
compare(locations, 'locationsByMethod');
compare(record, 'fightsByFighter');
compare(common, 'fightersCommon');
compare(methods, 'methodsByFighter');

assert.equal(fighterId, 17);
assert.equal(submission, 'Rear-naked choke');

const id = await db.coach.insert({
  name: 'Eugene Bareman',
  city: 'Auckland'
});
assert.equal(id, 1);
const inserted = await db.coach.get({ id: 1 });
assert.notEqual(inserted, undefined);
assert.equal(inserted.city, 'Auckland');
await db.coach.update({ id: 1 }, { city: 'Brisbane' });
const updated = await db.coach.get({ id: 1 });
assert.equal(updated.city, 'Brisbane');
await db.coach.remove({ id: 1 });
const removed = await db.coach.get({ id: 1 });
assert.equal(removed, undefined);
const limited = await db.fighters.get(null, { limit: 10 });
assert.equal(limited.length, 10);
const left = await db.fighters.right();
console.log(left);

console.log('All tests passed');

process.exit();
