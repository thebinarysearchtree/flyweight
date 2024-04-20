import { strict as assert } from 'assert';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const rewrite = process.argv[2] === 'rewrite';

const compare = (actual, result) => {
  const path = join('results', `${result}.json`);
  const url = new URL(path, import.meta.url);
  const actualString = JSON.stringify(actual);
  let expected;
  try {
    expected = readFileSync(url, 'utf8');
  }
  catch {
    console.log(`Writing ${result}.json`);
    writeFileSync(url, actualString, 'utf8');
    return;
  }
  try {
    assert.equal(actualString, expected, result);
  }
  catch (e) {
    if (rewrite) {
      writeFileSync(url, actualString, 'utf8');
    }
    else {
      throw Error('Results do not match');
      throw e;
    }
  }
}

const compareTypes = () => {
  const path = join('results', 'db.d.ts');
  const actual = readFileSync(new URL('db.d.ts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL(path, import.meta.url), 'utf8');
  try {
    assert.equal(actual, expected);
  }
  catch (e) {
    if (rewrite) {
      console.log('Writing db.d.ts');
      writeFileSync(new URL(path, import.meta.url), actual, 'utf8');
    }
    else {
      throw Error('Type definitions do not match');
    }
  }
}

export {
  compare,
  compareTypes
}
