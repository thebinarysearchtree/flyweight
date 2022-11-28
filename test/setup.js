import { execSync } from 'child_process';
import { readdir } from 'fs/promises';
import { chdir } from 'process';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

const exec = (command) => execSync(command, { stdio: 'inherit' });

const getDatabase = async () => {
  const folder = new URL('databases', import.meta.url); 
  const filenames = await readdir(folder);
  if (!filenames.includes('test.db')) {
    console.log('Downloading database.');
    const res = await fetch('https://github.com/thebinarysearchtree/flyweight/raw/4b24a1882de3deb8077ef1333310cfde939c3149/test.db');
    const path = join(folder, 'test.db');
    const file = createWriteStream(path);
    await pipeline(res.body, file);
  }
}

const getExtension = async () => {
  const filenames = await readdir(new URL('extensions', import.meta.url));
  const filename = process.platform === 'darwin' ? 'pcre2.dylib' : 'pcre2.so';
  if (!filenames.includes(filename)) {
    chdir('../extensions');
    exec('node pcre2.js');
    exec(`cp ${filename} ../test/extensions/.`);
  }
}

await getDatabase();
await getExtension();

console.log('Setup complete.');
