import json from './json.js';
import queries from './queries.js';
import sql from './sql.js';

const tests = [json, queries, sql];

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
