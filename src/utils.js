import pluralize from 'pluralize';

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

const joinOne = (t1, t2, columns) => {
  for (const item of t1) {
    for (const column of columns) {
      const name = column.substring(0, column.length - 2);
      item[name] = t2.find(r => r.id === item[column]);
      delete item[column];
    }
  }
}

const joinMany = (tables) => {
  const [left, right] = Object.keys(tables);
  const foreignKey = pluralize.singular(left) + 'Id';
  for (const item of tables[left]) {
    item[right] = tables[right].filter(r => r[foreignKey] === item.id);
  }
  for (const item of tables[right]) {
    delete item[foreignKey];
  }
}

export {
  toValues
}
