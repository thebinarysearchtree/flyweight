import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const toValues = (rows) => {
  if (!rows || rows.length === 0) {
    return rows;
  }
  const sample = rows[0];
  const keys = Object.keys(sample);
  if (keys.length === 1) {
    const key = keys[0];
    return rows.map(r => r[key]);
  }
  return rows;
}

const readSql = async (path) => {
  let sql = '';
  if (path.endsWith('.sql')) {
    sql = await readFile(path, 'utf8');
  }
  else {
    const names = await readdir(path);
    for (const name of names) {
      if (name.endsWith('.sql')) {
        let text = await readFile(join(path, name), 'utf8');
        text = text.trim();
        if (!text.endsWith(';')) {
          text += ';';
        }
        text += '\n\n';
        sql += text;
      }
    }
  }
  return sql.trim() + '\n';
}

export {
  toValues,
  readSql
}
