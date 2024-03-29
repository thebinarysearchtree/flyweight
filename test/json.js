import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const lastFights = await db.fighter.lastFights({ id: 17 });
  for (const date of lastFights.dates) {
    assert.equal(date instanceof Date, true);
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
