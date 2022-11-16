import { makeTypes } from './db.js';
import { compareTypes } from './utils.js';

const run = async () => {
  await makeTypes();
  compareTypes();
}

export default {
  name: 'types',
  run
};
