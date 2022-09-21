import db from './db.js';

const event = await db.event.getById({ id: 100 });
const cards = await db.cards.get({ eventId: 100 });
const locations = await db.locations.byMethod({ id: 1 });
const record = await db.fights.byFighter({ id: 342 });
const common = await db.fighters.common({ fighter1: 17, fighter2: 2624 });
const methods = await db.methods.byFighter({ fighterId: 17 });
const fighterId = await db.fighter.get({ name: /Israel/ }, 'id');
console.log(event);
console.log(cards[0]);
console.log(locations[0]);
console.log(record);
console.log(common);
console.log(methods);
console.log(fighterId);
process.exit();
