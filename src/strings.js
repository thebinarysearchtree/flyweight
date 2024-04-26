class FileSystem {
  constructor(db) {
    this.db = db;
    this.statements = {
      readdir: d1.prepare('select path from flyweightQueries where path like ?'),
      readFile: d1.prepare('select sql from flyweightQueries where path = ?')
    }
  }

  async readdir(path) {
    const param = `${path}%`;
    const meta = await this.statements.readdir.bind(param).all();
    return meta.result.map(s => s.split('/').at(-1));
  }

  async readFile(path) {
    const meta = await this.statements.readFile.bind(path).all();
    if (meta.result.length === 0) {
      throw Error('File does not exist');
    }
    return meta.result[0].sql;
  }

  async readSql(path) {
    let sql = '';
    if (path.endsWith('.sql')) {
      sql = await readFile(path);
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

  join(...sections) {
    return sections.join('/');
  }
}

export default FileSystem;
