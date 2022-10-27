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
  const tx = await db.getTransaction();
  try {
    await tx.begin();
    javierId = await tx.coach.insert({
      name: 'Javier Mendez',
      city: 'San Jose'
    });
    throw Error();
  }
  catch {
    await tx.rollback();
  }
  let javier = await tx.coach.get({ id: javierId });
  assert.equal(javier, undefined);

  try {
    await tx.begin();
    javierId = await tx.coach.insert({
      name: 'Javier Mendez',
      city: 'San Jose'
    });
    await tx.commit();
  }
  catch {
    await tx.rollback();
  }
  javier = await tx.coach.get({ id: javierId });
  assert.notEqual(javier, undefined);
  await tx.coach.remove({ id: javierId });

  await tx.coaches.insert([
    {
      name: 'Eugene Bareman',
      city: 'Auckland'
    },
    {
      name: 'Trevor Wittman',
      city: 'Denver'
    },
  ]);
  let coaches = await tx.coaches.get();
  assert.equal(coaches.length, 2);
  await tx.coach.remove({ name: /^[e-u]+\s[a-r]+$/i });
  coaches = await tx.coaches.get();
  assert.equal(coaches.length, 1);
  await tx.coaches.remove();
  db.release(tx);

  const methodCount = await db.fights.get({ methodId: null }, { count: true });
  assert.equal(methodCount, 45);

  const wait = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), 100);
    });
  }

  const t1 = async () => {
    const tx = await db.getTransaction();
    await tx.begin();
    await tx.coach.insert({
      name: 'Test User',
      city: 'Whatever'
    });
    await wait();
    await tx.commit();
    db.release(tx);
  }
  const t2 = async () => {
    const tx = await db.getTransaction();
    await tx.begin();
    await tx.coach.insert({
      name: 'Test User 2',
      city: 'Whatever 2'
    });
    await tx.rollback();
    db.release(tx);
  }
  const promises = [t1(), t2()];
  await Promise.all(promises);
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
