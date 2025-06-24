let paramCount = 1;

const getPlaceholder = () => {
  const count = paramCount;
  paramCount++;
  if (paramCount > (2 ** 20)) {
    paramCount = 0;
  }
  return `p_${count}`;
}

const toValues = (rows) => {
  if (!rows || rows.length === 0) {
    return rows;
  }
  const sample = rows[0];
  const keys = Object.keys(sample);
  if (keys.length === 1) {
    const key = keys[0];
    return rows.map(r => r[key]);
  }
  return rows;
}

const expressionHandler = (expression) => {
  const columnHandler = {
    get: function(target, property) {
      const request = {
        name: property,
        path: [],
        proxy: null
      };
      const pathHandler = {
        get: function(target, property) {
          const path = target.path;
          path.push(property);
          return pathProxy;
        }
      };
      const pathProxy = new Proxy(request, pathHandler);
      request.proxy = pathProxy;
      columnRequests.push(request);
      return pathProxy;
    }
  }
  const columnTarget = {};
  const columnProxy = new Proxy(columnTarget, columnHandler);
  const columnRequests = [];
  const methodHandler = {
    get: function(target, property) {
      const request = {
        name: property,
        args: null
      };
      methodRequests.push(request);
      return (...args) => {
        request.args = args;
        return request;
      };
    }
  }
  const methodTarget = {};
  const methodProxy = new Proxy(methodTarget, methodHandler);
  const methodRequests = [];
  expression(columnProxy, methodProxy);
  const method = methodRequests.at(0);
  const operators = new Map([
    ['plus', '+'],
    ['minus', '-'],
    ['divide', '/'],
    ['multiply', '*']
  ]);
  const createClause = (options) => {
    const {
      params,
      alias,
      adjuster 
    } = options;
    let aliasClause = '';
    if (alias) {
      aliasClause = ` as ${alias}`;
    }
    const processColumn = (column) => {
      if (column.path.length === 0) {
        return adjuster ? adjuster(column.name) : column.name;
      }
      const placeholder = getPlaceholder();
      const path = `$.${column.path.join('.')}`;
      params[placeholder] = path;
      return `json_extract(${column.name}, $${placeholder})`;
    }
    const processMethod = (method) => {
      const statements = [];
      for (const arg of method.args) {
        const subMethod = methodRequests.find(r => r === arg);
        if (subMethod) {
          const statement = processMethod(subMethod);
          statements.push(statement);
          continue;
        }
        const column = columnRequests.find(r => r.proxy === arg);
        if (column) {
          const statement = processColumn(column);
          statements.push(statement);
        }
        else {
          const placeholder = getPlaceholder();
          params[placeholder] = arg;
          statements.push(`$${placeholder}`);
        }
      }
      const operator = operators.get(method.name);
      if (operator) {
        return statements.join(` ${operator} `);
      }
      return `${method.name}(${statements.join(', ')})`;
    }
    let statement;
    if (!method) {
      const column = columnRequests.at(0);
      statement = processColumn(column);
    }
    else {
      statement = processMethod(method);
    }
    return `${statement}${aliasClause}`;
  }
  return {
    operators,
    columnRequests,
    methodRequests,
    createClause
  };
}

export {
  toValues,
  getPlaceholder,
  expressionHandler
}
