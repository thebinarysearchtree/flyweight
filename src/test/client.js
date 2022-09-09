import db from './db.js';
import { makeClient } from '../proxy.js';

const client = makeClient(db, '/Users/andrew/Projects/flyweight/src/test/sql');

export default client;
