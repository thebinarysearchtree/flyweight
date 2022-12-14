import { readFile } from 'fs/promises';
import { parseInterfaces } from '../src/parsers/interfaces.js';

const file = await readFile('interfaces.d.ts', 'utf8');

const interfaces = parseInterfaces(file);

console.log(interfaces);