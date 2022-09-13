import db from './db.js';
import database from './database.js';

database.registerMappers('events', [{
  query: 'getById',
  prefixes: ['blue', 'red'],
  result: 'object'
}]);

const event = await db.events.getById();
console.log(event.cards[0].fights[0]);
process.exit();
