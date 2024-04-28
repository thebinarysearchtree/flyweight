class Modifier {
  constructor(name, value, operator) {
    this.name = name;
    this.value = value;
    this.operator = operator;
  }
}

const create = (name, operator) => {
  return (value) => value === undefined ? value : new Modifier(name, value, operator);
}

const not = create('not', '!=');
const gt = create('gt', '>');
const gte = create('gte', '>=');
const lt = create('lt', '<');
const lte = create('lte', '<=');
const like = create('like', 'like');
const match = create('match', 'match');
const glob = create('glob', 'glob');

export {
  Modifier,
  not,
  gt,
  gte,
  lt,
  lte,
  like,
  match,
  glob
}
