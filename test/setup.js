import { readdir, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

const folder = new URL('databases', import.meta.url); 
await mkdir(folder, { recursive: true });
const filenames = await readdir(folder);
if (!filenames.includes('test.db')) {
  console.log('Downloading database.');
  const res = await fetch('https://github.com/thebinarysearchtree/flyweight/raw/4b24a1882de3deb8077ef1333310cfde939c3149/test.db');
  const path = join(folder.pathname, 'test.db');
  const file = createWriteStream(path);
  await pipeline(res.body, file);
}
console.log('Setup complete.');
