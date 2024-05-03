import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';
import { like } from '../index.js';

const run = async () => {
  const cards = await db.cards.get({ eventId: 100 });
  const fighterId = await db.fighter.get({ name: like('Israel%') }, 'id');

  compare(cards, 'cardsGet');
  assert.equal(fighterId, 17);

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
  const profiles = await db.fighterProfiles.get({ fighterProfiles: 'Sao' }, 
  { 
    highlight: { 
      column: 'hometown', 
      tags: ['<b>', '</b>'] 
    }, 
    bm25: { 
      name: 1, 
      hometown: 10 
    },
    limit: 5
  });
  compare(profiles, 'fighterProfiles');
  await db.coaches.remove();
  await db.coach.insert({ name: 'Andrew', city: 'Brisbane' });
  await db.coach.insert({ name: 'Andrew', city: 'Brisbane' });
  await db.coaches.update({ name: 'Andrew' }, { name: 'Eugene' });
  const count = await db.coaches.count({ name: 'Eugene' });
  assert.equal(count, 2);
  await db.coaches.remove();
}

const cleanUp = async () => {
  await db.coaches.remove();
}

export default {
  name: 'queries',
  run,
  cleanUp
};
