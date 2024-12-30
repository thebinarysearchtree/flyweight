class Modifier {
  constructor(conditions) {
    this.conditions = conditions;
  }
}

const map = new Map([
  ['not', '!='],
  ['gt', '>'],
  ['gte', '>='],
  ['lt', '<'],
  ['lte', '<='],
  ['like', 'like'],
  ['match', 'match'],
  ['glob', 'glob']
]);

const create = (name) => {
  const operator = map.get(name);
  return (value) => value === undefined ? value : new Modifier([{ name, operator, value }]);
}

const range = (operators) => {
  const conditions = Object
    .entries(operators)
    .map(([key, value]) => {
      const operator = map.get(key);
      if (!operator) {
        throw Error('Invalid operator in range statement');
      }
      return {
        name: key,
        operator,
        value
      };
    });
  return new Modifier(conditions);
}

const not = create('not');
const gt = create('gt');
const gte = create('gte');
const lt = create('lt');
const lte = create('lte');
const like = create('like');
const match = create('match');
const glob = create('glob');

export {
  Modifier,
  not,
  gt,
  gte,
  lt,
  lte,
  like,
  range,
  match,
  glob
}
