import { getTables } from './tables.js';
import { getType } from '../parsers.js';
import { readFile, writeFile } from 'fs/promises';
import pluralize from 'pluralize';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const createTypes = async (sqlPath, destinationFile) => {
  const sql = await readFile(sqlPath, 'utf8');
  const tables = getTables(sql);
  let types = '';
  const returnTypes = [];
  for (const table of tables) {
    const singular = pluralize.singular(table.name);
    const interfaceName = capitalize(singular);
    returnTypes.push(`    ${table.name}: BasicQueries<${interfaceName}>`);
    types += `export interface ${interfaceName} {\n`;
    for (const column of table.columns) {
      const { name, type, notNull } = column;
      const parsedType = getType(name);
      let jsType;
      if (parsedType) {
        jsType = parsedType;
      }
      else {
        if (type === 'integer' || type === 'real') {
          jsType = 'number';
        }
        if (type === 'text') {
          jsType = 'string';
        }
        if (type === 'blob') {
          jsType = 'Buffer';
        }
      }
      let property = `  ${name}`;
      property += ': ';
      property += jsType;
      if (!notNull) {
        property += ' | null';
      }
      property += ';\n';
      types += property;
    }
    types += '}\n\n';
  }
  types += `declare module 'flyweight' {\n`;
  types += `  export function makeTypedClient(database: Database, sqlDir?: string): {\n`;
  types += returnTypes.join(',\n');
  types += '\n  }\n';
  types += '}\n\n';
  console.log(types);
}

export {
  createTypes
}
