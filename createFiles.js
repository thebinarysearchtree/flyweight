import { readFile, writeFile } from 'fs/promises';

const index = await readFile('index.d.ts', 'utf-8');
const interfaces = await readFile('interfaces.d.ts', 'utf-8');
const sqlite = await readFile('sqlite.d.ts', 'utf-8');
const turso = await readFile('turso.d.ts', 'utf-8');

const contents = `export default { index: \`${index}\`, interfaces: \`${interfaces}\`, sqlite: \`${sqlite}\`, turso: \`${turso}\` }\n`;

await writeFile('./src/parsers/files.js', contents);
