const convertTables = (sql, db) => {
  for (const [name, options] of Object.entries(db.customTypes)) {
    const pattern = new RegExp(`\\s(?<columnName>[a-z0-9_]+)\\s(?<type>${name})\\s[^,]+,`, 'gmi');
    sql = sql.replaceAll(pattern, (match, columnName) => {
      const { dbType, makeConstraint } = options;
      match = match.replace(` ${name} `, ` ${dbType} `);
      if (makeConstraint) {
        const constraint = makeConstraint(columnName);
        match = match.replace(/,$/, constraint + ',');
      }
      return match;
    });
  }
  return sql;
}

const convertToDb = (value, db) => {
  for (const customType of Object.values(db.customTypes)) {
    if (customType.valueTest(value)) {
      return customType.jsToDb(value);
    }
  }
  return value;
}

const convertToJs = (type, value, db) => {
  const customType = db.customTypes[type];
  return customType.dbToJs(value);
}