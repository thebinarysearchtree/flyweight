import { db } from './db.js';
import { strict as assert } from 'assert';

const run = async () => {
  let javierId;
  const tx = await db.getTransaction();
  try {
    await tx.begin();
    javierId = await tx.coaches.insert({
      name: 'Javier Mendez',
      city: 'San Jose'
    });
    throw Error();
  }
  catch {
    await tx.rollback();
  }
  let javier = await tx.coaches.get({ id: javierId });
  assert.equal(javier, undefined);

  try {
    await tx.begin();
    javierId = await tx.coaches.insert({
      name: 'Javier Mendez',
      city: 'San Jose'
    });
    await tx.commit();
  }
  catch {
    await tx.rollback();
  }
  javier = await tx.coaches.get({ id: javierId });
  assert.notEqual(javier, undefined);
  await tx.coaches.remove({ id: javierId });

  await tx.coaches.insertMany([
    {
      name: 'Eugene Bareman',
      city: 'Auckland'
    },
    {
      name: 'Trevor Wittman',
      city: 'Denver'
    },
  ]);
  let coaches = await tx.coaches.many();
  assert.equal(coaches.length, 2);
  await tx.coaches.remove({ name: 'Eugene Bareman' });
  coaches = await tx.coaches.many();
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
    await tx.coaches.insert({
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
    await tx.coaches.insert({
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
