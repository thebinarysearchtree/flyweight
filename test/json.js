import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const lastFights = await db.fighter.lastFights({ id: 17 });
  let last;
  for (const date of lastFights.dates) {
    if (last) {
      assert.equal(date.getTime() > last.getTime(), false);
    }
    last = date;
  }
  const weightClasses = await db.fighter.weightClasses({ fighterId: 17 });
  assert.equal(typeof weightClasses.weightClasses[0].nest.age, 'boolean');
  const test = await db.events.test();
  assert.equal(test[0].nest.startTime instanceof Date, true);
  const otherNames = await db.fighters.otherNames();
  assert.equal(otherNames.some(n => n.otherNames.length === 0), true);
  const instagram = await db.fighters.instagram();
  compare(instagram, 'fighterInstagram');
  const dates = ['2022-10-1', '2022-10-2', '2022-7-2', '2022-1-12', '2022-10-3'].map(d => new Date(d));
  const tx = await db.getTransaction();
  await tx.coach.insert({
    name: 'Test User',
    city: 'Brisbane',
    profile: {
      medical: {
        age: 21,
        fit: true,
        testDate: dates[0],
        nested: {
          test: [dates[1], dates[2]]
        }
      },
      tests: [
        { id: 1, testDate: dates[3], result: 100 }, 
        { id: 2, testDate: dates[4], result: 200 }
      ]
    }
  });
  const coach = await tx.method.coach();
  const coach2 = await tx.coach.get();
  await tx.coaches.remove();
  db.release(tx);
  compare(coach, 'methodCoach');
  compare(coach2, 'getCoach');
}

export default {
  name: 'json',
  run
};
