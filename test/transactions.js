import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
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
  await tx.coach.remove({ name: 'Eugene Bareman' });
  coaches = await tx.coaches.get();
  assert.equal(coaches.length, 1);
  await tx.coaches.remove();
  db.release(tx);

  const methodCount = await db.fights.count({ methodId: null });
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
  name: 'transactions',
  run,
  cleanUp
};
