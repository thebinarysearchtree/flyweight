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
  const otherNames = await db.fighters.otherNames();
  assert.equal(otherNames.some(n => n.otherNames.length === 0), true);
  const instagram = await db.fighters.instagram();
  compare(instagram, 'fighterInstagram');
}

export default {
  name: 'json',
  run
};
