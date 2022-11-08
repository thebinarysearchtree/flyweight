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
  console.log(instagram);
}

export default {
  name: 'json',
  run
};
