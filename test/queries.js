import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const cards = await db.cards.many({ eventId: 100 });
  const fighterId = await db.fighters.get({ name: s => s.like('Israel%') }, 'id');

  compare(cards, 'cardsGet');
  assert.equal(fighterId, 17);

  const id = await db.coaches.insert({
    name: 'Eugene Bareman',
    city: 'Auckland'
  });
  assert.equal(id, 1);
  const inserted = await db.coaches.get({ id: 1 });
  assert.notEqual(inserted, undefined);
  assert.equal(inserted.city, 'Auckland');
  await db.coaches.update({ id: 1 }, { city: 'Brisbane' });
  const updated = await db.coaches.get({ id: 1 });
  assert.equal(updated.city, 'Brisbane');
  await db.coaches.remove({ id: 1 });
  const removed = await db.coaches.get({ id: 1 });
  assert.equal(removed, undefined);
  const limited = await db.fighters.many(null, null, { limit: 10 });
  assert.equal(limited.length, 10);
  const profiles = await db.fighterProfiles.query({
    where: { 
      fighterProfiles: 'Sao'
    },
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
  await db.coaches.insert({ name: 'Andrew', city: 'Brisbane' });
  await db.coaches.insert({ name: 'Andrew', city: 'Brisbane' });
  await db.coaches.update({ name: 'Andrew' }, { name: 'Eugene' });
  const count = await db.coaches.count({ name: 'Eugene' });
  assert.equal(count, 2);
  await db.coaches.remove();
  const fighterCount = await db.fighters.count({ id: n => n.range({ gt: 10, lt: 15 }) });
  assert.equal(fighterCount, 4);
  const whereSelector = await db.fighters.get({ social: s => s.instagram.eq('angga_thehitman') });
  assert.equal(whereSelector.id, 2);
  const t = await db.fighters.many({ id: n => n.lt(10) }, c => c.social.instagram);
  const r = await db.fighters.query({
    where: {
      id: n => n.lt(10)
    },
    select: ['id', 'born']
  });
  const p = await db.fighters.get({ id: 2 }, ['id', 'born', { select: c => c.social.instagram, as: 'instagram' }]);
  console.log(p);
  const x = await db.fighters.get({ id: 3, born: 'asfasf' });
  const xr = await db.fighters.query({
    where: {
      born: 'asfasf'
    },
    select: ['born']
  })
}

const cleanUp = async () => {
  await db.coaches.remove();
}

export default {
  name: 'queries',
  run,
  cleanUp
};
