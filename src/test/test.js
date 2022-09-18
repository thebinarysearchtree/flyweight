import db from './db.js';

const event = await db.event.getById({ id: 100 });
const cards = await db.cards.get({ eventId: 100 });
console.log(event);
console.log(cards[0]);
process.exit();
