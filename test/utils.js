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
      throw e;
    }
  }
}

export {
  compare
}
