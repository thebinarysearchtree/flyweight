import { execSync } from 'child_process';
import fetch from 'node-fetch';
import { readdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { chdir } from 'process';
import { platform } from 'os';

const download = async (url) => {
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  const filename = url.split('/').at(-1);
  const file = createWriteStream(filename);
  await pipeline(res.body, file);
}

const exec = (command) => execSync(command, { stdio: 'inherit' });

const sqlite = 'sqlite-amalgamation-3390400';
const pcre2 = 'pcre2-10.40';

const getFiles = async () => {
  const filenames = await readdir(new URL('.', import.meta.url));
  if (!filenames.includes(sqlite)) {
    await download('https://www.sqlite.org/2022/sqlite-amalgamation-3390400.zip');
    exec(`unzip ${sqlite}.zip`);
    exec(`rm ${sqlite}.zip`);
  }
  if (!filenames.includes(pcre2)) {
    await download('https://github.com/PCRE2Project/pcre2/releases/download/pcre2-10.40/pcre2-10.40.zip');
    exec(`unzip ${pcre2}.zip`);
    exec(`rm ${pcre2}.zip`);
  }
}

const installPcre2 = async () => {
  chdir(pcre2);
  const filenames = await readdir(new URL(pcre2, import.meta.url));
  if (!filenames.includes('Makefile')) {
    exec('./configure --enable-jit');
  }
  if (!filenames.includes('pcre2test')) {
    exec('sudo make install');
  }
  chdir('../');
}

await getFiles();
await installPcre2();
if (platform === 'darwin') {
  exec(`gcc -g -fPIC -dynamiclib pcre2.c -o pcre2.dylib -lpcre2-8 -I ${sqlite}`);
}
else {
  exec(`gcc -g -fPIC -shared pcre2.c -o pcre2.so -lpcre2-8 -I ${sqlite}`);
}

console.log('Extension created.');
