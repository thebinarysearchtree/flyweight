import database from './database.js';
import { makeClient } from '../proxy.js';

const client = makeClient(database, '/Users/andrew/Projects/flyweight/src/test/sql');

export default client;
