class Modifier {
  constructor(name, value, operator) {
    this.name = name;
    this.value = value;
    this.operator = operator;
  }
}

const not = (value) => value === undefined ? value : new Modifier('not', value, '!=');
const gt = (value) => value === undefined ? value : new Modifier('gt', value, '>');
const gte = (value) => value === undefined ? value : new Modifier('gte', value, '>=');
const lt = (value) => value === undefined ? value : new Modifier('lt', value, '<');
const lte = (value) => value === undefined ? value : new Modifier('lte', value, '<=');

export {
  Modifier,
  not,
  gt,
  gte,
  lt,
  lte
}
