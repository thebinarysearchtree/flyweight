const d1 = env.DB;

const statements = {
  readdir: d1.prepare('select fileName from flyweightQueries where table = ?'),
  readFile: d1.prepare('select sql from flyweightQueries where table = ? and fileName = ?')
};

const readdir = async (table) => {
  const meta = await statements.readdir.bind(table).all();
  return meta.result;
}

const readFile = async (path) => {
  if (typeof path === 'string') {
    path = [path];
  }
  const table = path.length > 1 ? path[0] : null;
  const fileName = path.length > 1 ? path[1] : path[0];
  const meta = await statements.readFile.bind(table, fileName).all();
  if (meta.result.length === 0) {
    throw Error('File does not exist');
  }
  return meta.result[0].sql;
}
const writeFile = async () => undefined;
const rm = async () => undefined;
const join = (...sections) => sections;

export {
  readdir,
  readFile,
  writeFile,
  rm,
  join
}