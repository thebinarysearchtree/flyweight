const compareOperators = new Map([
  ['not', '!='],
  ['gt', '>'],
  ['gte', '>='],
  ['lt', '<'],
  ['lte', '<='],
  ['like', 'like'],
  ['match', 'match'],
  ['glob', 'glob'],
  ['eq', '=']
]);

const mathOperators = new Map([
  ['plus', '+'],
  ['minus', '-'],
  ['divide', '/'],
  ['multiply', '*']
]);

const compareMethods = ['not', 'gt', 'lt', 'lte', 'like', 'natch', 'glob', 'eq'];
const computeMethods = ['abs', 'coalesce', 'concat', 'concatWs', 'format', 'glob', 'hex', 'if', 'instr', 'length', 'lower', 'ltrim', 'max', 'min', 'nullif', 'octetLength', 'replace', 'round', 'rtrim', 'sign', 'substring', 'trim', 'unhex', 'unicode', 'upper', 'date', 'time', 'dateTime', 'julianDay', 'unixEpoch', 'strfTime', 'timeDiff', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'ceil', 'cos', 'cosh', 'degrees', 'exp', 'floor', 'ln', 'log', 'mod', 'pi', 'power', 'radians', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc', 'json', 'extract', 'plus', 'minus', 'divide', 'multiply', 'object', 'arrayLength'];
const windowMethods = ['count', 'min', 'max', 'avg', 'sum', 'rowNumber', 'rank', 'denseRank', 'percentRank', 'cumeDist', 'ntile', 'lag', 'lead', 'firstValue', 'lastValue', 'nthValue', 'group'];

const toDbName = (method) => {
  const { name, args } = method;
  const excluded = ['dateTime', 'julianDay', 'unixEpoch', 'strfTime', 'timeDiff'];
  if (excluded.includes(name)) {
    return name.toLowerCase();
  }
  if (name === 'toJson') {
    return 'json';
  }
  if (name === 'toDate') {
    return 'date';
  }
  if (name === 'if') {
    return 'iif';
  }
  if (name === 'group') {
    if (args.length === 2) {
      return 'json_group_object';
    }
    return 'json_group_array';
  }
  if (name === 'arrayLength') {
    return 'json_array_length';
  }
  if (name === 'extract') {
    return 'json_extract';
  }
  if (name === 'object') {
    return 'json_object';
  }
  return name
    .replaceAll(/([A-Z])/gm, '_$1')
    .toLowerCase();
}

export {
  compareOperators,
  mathOperators,
  compareMethods,
  computeMethods,
  windowMethods,
  toDbName
}
