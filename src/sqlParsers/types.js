import { getTables } from './tables.js';
import { getType } from '../parsers.js';
import { readFile, writeFile } from 'fs/promises';
import pluralize from 'pluralize';

const capitalize = (word) => word[0].toUpperCase() + word.substring(1);

const createTypes = async (sqlPath, destinationPath) => {
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
      let tsType;
      if (parsedType) {
        tsType = parsedType;
      }
      else {
        if (type === 'integer' || type === 'int' || type === 'real') {
          tsType = 'number';
        }
        if (type === 'text') {
          tsType = 'string';
        }
        if (type === 'blob') {
          tsType = 'Buffer';
        }
        if (type === 'any') {
          tsType = 'any';
        }
      }
      let property = `  ${name}`;
      property += ': ';
      property += tsType;
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
  await writeFile(destinationPath, types, 'utf8');
}

export {
  createTypes
}
