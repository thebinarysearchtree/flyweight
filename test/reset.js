import { database, paths } from './db.js';
import { prompt } from 'flyweight-client';

await prompt(database, paths, true);
