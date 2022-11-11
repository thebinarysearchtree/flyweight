const getConverter = (type, db, keys = []) => {
  if (type.basicType && type.tsType === 'Date') {
    const dateConverter = db.getDbToJsConverter('date');
    const converter = (v) => {
      if (keys.length > 0) {
        let current = v;
        const lastKey = keys.at(-1);
        for (const key of keys.slice(0, -1)) {
          current = current[key];
        }
        const value = current[lastKey];
        if (value !== null && value !== undefined) {
          current[lastKey] = dateConverter(value);
        }
      }
      else {
        if (v !== null && v !== undefined) {
          return dateConverter(v);
        }
        return v;
      }
    }
    return converter;
  }
  if (type.arrayType) {
    const converter = getConverter(type.arrayType, db);
    if (converter) {
      const arrayConverter = (v) => {
        let current = v;
        for (const key of keys) {
          current = current[key];
        }
        const items = [];
        for (const item of current) {
          const adjusted = converter(item);
          items.push(adjusted);
        }
        return items;
      }
      return arrayConverter;
    }
  }
  if (type.objectProperties) {
    const converters = [];
    for (const [key, value] of Object.entries(type.objectProperties)) {
      const converter = getConverter(value, db, [...keys, key]);
      if (converter) {
        converters.push(converter);
      }
    }
    if (converters.length > 0) {
      const converter = (v) => {
        for (const converter of converters) {
          converter(v);
        }
        return v;
      }
      return converter;
    }
  }
  if (type.tupleTypes) {
    const converters = [];
    for (const tupleType of type.tupleTypes) {
      const converter = getConverter(tupleType, db);
      converters.push(converter);
    }
    if (converters.some(c => c !== undefined)) {
      const converter = (v) => {
        let current = v;
        for (const key of keys) {
          current = current[key];
        }
        let i = 0;
        for (const converter of converters) {
          if (converter !== undefined) {
            current[i] = converter(current[i]);
          }
          i++;
        }
        return current;
      }
      return converter;
    }
  }
}

export {
  getConverter
}
