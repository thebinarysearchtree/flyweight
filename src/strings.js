class FileSystem {
  constructor(database) {
    this.database = database;
  }

  async readdir(path) {
    const param = `${path}%`;
    const d1 = this.database.d1;
    const sql = 'select path from flyweightQueries where path like ?';
    const meta = await d1.prepare(sql).bind(param).all();
    return meta.result.map(s => s.split('/').at(-1));
  }

  async readFile(path) {
    const d1 = this.database.d1;
    const sql = 'select sql from flyweightQueries where path = ?';
    const meta = await d1.prepare(sql).bind(path).all();
    if (meta.result.length === 0) {
      throw Error('File does not exist');
    }
    return meta.result[0].sql;
  }

  async readSql(path) {
    let sql = '';
    if (path.endsWith('.sql')) {
      sql = await this.readFile(path);
    }
    else {
      const names = await this.readdir(path);
      for (const name of names) {
        if (name.endsWith('.sql')) {
          let text = await this.readFile(join(path, name), 'utf8');
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
