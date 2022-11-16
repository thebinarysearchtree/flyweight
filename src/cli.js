#!/usr/bin/env node

import { getConfig } from './file.js';
import Database from './db.js';
import { makeTypes, getTables, createMigration, runMigration } from './utils.js';

const config = await getConfig();
const db = new Database();
await db.initialize();

console.log(process.argv[2]);
console.log(process.argv[3]);
