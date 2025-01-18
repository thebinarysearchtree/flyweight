import { db, database } from './db.js';

const run = async () => {
  await db.cards.many({ eventId: 100 });
  await db.fighters.get({ name: n => n.like('Israel%') }, 'id');
  await database.close();
}

export default {
  name: 'close',
  run
};
