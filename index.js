import Database from './src/db.js';
import { registerParser } from './src/parsers.js';
import { registerMappers } from './src/utils.js';
import { makeClient } from './src/proxy.js';

const makeTypedClient = makeClient;

export {
  Database,
  registerParser,
  registerMappers,
  makeClient,
  makeTypedClient
}
