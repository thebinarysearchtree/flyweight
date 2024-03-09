import { makeTypes } from './db.js';

const run = async () => {
  await makeTypes();
}

export default {
  name: 'types',
  run
};
