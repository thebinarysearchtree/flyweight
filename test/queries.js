import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const cards = await db.cards.get({ eventId: 100 });
  const fighterId = await db.fighter.get({ name: /Israel/ }, 'id');

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
  await db.coach.update({ id: 1 }, { city: 'δδδδδ' });
  const greek = await db.coach.get({ city: /\p{Script=Greek}+/u });
  assert.equal(greek.id, 1);
  await db.coach.remove({ id: 1 });
  const removed = await db.coach.get({ id: 1 });
  assert.equal(removed, undefined);
  const limited = await db.fighters.get(null, { limit: 10 });
  assert.equal(limited.length, 10);
  const israel = await db.fighter.get({ name: /israel/i }, ['name', 'id']);
  assert.equal(israel.id, 17);

  let javierId;
  try {
    await db.begin();
    javierId = await db.coach.insert({
      name: 'Javier Mendez',
      city: 'San Jose'
    });
    throw Error();
  }
  catch {
    await db.rollback();
  }
  let javier = await db.coach.get({ id: javierId });
  assert.equal(javier, undefined);

  try {
    await db.begin();
    javierId = await db.coach.insert({
      name: 'Javier Mendez',
      city: 'San Jose'
    });
    await db.commit();
  }
  catch {
    await db.rollback();
  }
  javier = await db.coach.get({ id: javierId });
  assert.notEqual(javier, undefined);
  await db.coach.remove({ id: javierId });

  await db.coaches.insert([
    {
      name: 'Eugene Bareman',
      city: 'Auckland'
    },
    {
      name: 'Trevor Wittman',
      city: 'Denver'
    },
  ]);
  let coaches = await db.coaches.get();
  assert.equal(coaches.length, 2);
  await db.coach.remove({ name: /^[e-u]+\s[a-r]+$/i });
  coaches = await db.coaches.get();
  assert.equal(coaches.length, 1);
  await db.coaches.remove();
  const methodCount = await db.fights.get({ methodId: null }, { count: true });
  assert.equal(methodCount, 45);

  const wait = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), 1000);
    });
  }

  const t1 = async () => {
    await db.begin();
    await db.coach.insert({
      name: 'Test User',
      city: 'Whatever'
    });
    await wait();
    const coaches = await db.coaches.get();
    console.log(coaches);
    await db.commit();
  }
  const t2 = async () => {
    await db.begin();
    await db.coach.insert({
      name: 'Test User 2',
      city: 'Whatever 2'
    });
    await db.rollback();
    const coaches = await db.coaches.get();
    console.log(coaches);
  }
  const promises = [t1(), t2()];
  await Promise.all(promises);
  console.log(await db.coaches.get());
}

const cleanUp = async () => {
  await db.coaches.remove();
}

export default {
  name: 'queries',
  run,
  cleanUp
};
