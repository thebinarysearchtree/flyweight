import db from './db.js';

const event = await db.events.getById({ id: 100 });
const cards = await db.cards.all({ eventId: 100 });
console.log(event);
console.log(cards[0]);
process.exit();
