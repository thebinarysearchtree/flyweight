class Modifier {
  constructor(name, value, operator) {
    this.name = name;
    this.value = value;
    this.operator = operator;
  }
}

const not = (value) => new Modifier('not', value, '!=');
const gt = (value) => new Modifier('gt', value, '>');
const gte = (value) => new Modifier('gte', value, '>=');
const lt = (value) => new Modifier('lt', value, '<');
const lte = (value) => new Modifier('lte', value, '<=');

export {
  Modifier,
  not,
  gt,
  gte,
  lt,
  lte
}
