import { db, database } from './db.js';

const run = async () => {
  await db.cards.get({ eventId: 100 });
  await db.fighter.get({ name: /Israel/ }, 'id');
  await database.close();
}

export default {
  name: 'queries',
  run
};
