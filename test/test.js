import json from './json.js';
import queries from './queries.js';
import sql from './sql.js';
import types from './types.js';
import transactions from './transactions.js';

let tests = [json, queries, sql, types, transactions];

const argument = process.argv[2];

if (argument && argument !== 'rewrite') {
  tests = tests.filter(t => t.name === argument);
}

for (const test of tests) {
  try {
    await test.run();
  }
  catch (e) {
    if (test.cleanUp) {
      await test.cleanUp();
    }
    throw e;
  }
}

console.log('All tests passed');

process.exit();
