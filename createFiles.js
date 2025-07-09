import { readFile, writeFile } from 'fs/promises';

const interfaces = await readFile('interfaces.d.ts', 'utf-8');

const contents = `export default \`${interfaces}\`\n`;

await writeFile('./src/parsers/files.js', contents);
