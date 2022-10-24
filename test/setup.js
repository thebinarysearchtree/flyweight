import { execSync } from 'child_process';
import { readdir } from 'fs/promises';
import { chdir } from 'process';
import { platform } from 'os';

const exec = (command) => execSync(command, { stdio: 'inherit' });

const getDatabase = async () => {
  const filenames = await readdir(new URL('databases', import.meta.url));
  if (!filenames.includes('test.db')) {
    exec('cp ../test.db ./databases/.');
  }
}

const getExtension = async () => {
  const filenames = await readdir(new URL('extensions', import.meta.url));
  const filename = platform() === 'darwin' ? 'pcre2.dylib' : 'pcre2.so';
  if (!filenames.includes(filename)) {
    chdir('../extensions');
    exec('node pcre2.js');
    exec(`cp ${filename} ../test/extensions/.`);
  }
}

await getDatabase();
await getExtension();

console.log('Setup complete.');
