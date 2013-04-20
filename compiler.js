var scanner = require("./scanner"), identifier = 0, __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  process.exit(1);
}

function say () { console.log.apply(console, __slice.call(arguments, 0)) }

function extend (to, from) {
  for (var key in from) to[key] = from[key];
  return to;
}

// Too many flavors of signature, only one necesary.
exports.update = function(definition) {
  var splat = __slice.call(arguments, 1), operation, key, object, update, where, star;
  if (typeof definition === "object" && splat.length === 0) {
    operation = { type: "update" };
    for (key in definition) {
      operation[key] = definition[key];
    }
    if (!operation.schema) operation.schema = 'public';
  } else {
    update = scanner.mutation(definition, true);
    if (splat.length === 2) {
      where = splat[0], object = splat[1];
    } else {
      object = where = splat[0];
    }
    operation = {
      type: "update",
      schema: update.schema,
      table: update.table,
      literals: update.literals,
      parameters: {},
      where: {}
    };
    update.where.forEach(function (column) {
      operation.where[column] = where[column];
    });
    if (update.columns.length == 0) {
      star = Object.keys(operation.literals).length == 0;
    } else {
      update.columns.forEach(function (column) {
        if (column === "*") {
          star = true;
        } else {
          operation.parameters[column] = object[column];
        }
      });
    }
    if (star) {
      for (key in object) {
        if (update.where.indexOf(key) == -1) {
          operation.parameters[key] = object[key];
        }
      }
    }
  }
  return operation;
};

exports["delete"] = function(definition, object) {
  var key, operation, mutation;
  if (typeof definition === "object") {
    operation = {
      type: "delete"
    };
    for (key in definition) {
      operation[key] = definition[key];
    }
    if (!operation.schema) operation.schema = 'public';
  } else {
    mutation = scanner.mutation(definition);
    operation = {
      type: "delete",
      schema: mutation.schema,
      table: mutation.table,
      where: {}
    };
    if (mutation.where.length === 0) {
      for (key in object) {
        operation.where[key] = object[key];
      }
    } else {
      mutation.where.forEach(function (key) {
        operation.where[key] = object[key];
      });
    }
  }
  return operation;
};

exports.insert = function(definition, object, type) {
  var mutation, key, operation, star;
  type = type || "insert";
  if (typeof definition === "object") {
    operation = {
      type: type,
      returning: [],
      parameters: {},
      literals: {}
    };
    for (key in definition) {
      operation[key] = definition[key];
    }
    if (!operation.schema) operation.schema = 'public';
  } else {
    mutation = scanner.mutation(definition);
    operation = {
      type: type,
      schema: mutation.schema,
      table: mutation.table,
      where: mutation.where,
      parameters: {},
      literals: mutation.literals
    };
    if (mutation.columns.length == 0) {
      star = !Object.keys(mutation.literals).length;
    } else {
      mutation.columns.forEach(function (column) {
        if (column == "*") {
          star = true;
        } else {
          operation.parameters[column] = object[column];
        }
      });
    }
    if (star) {
      for (key in object) {
        operation.parameters[key] = object[key];
      }
    }
  }
  return operation;
};

function subselect (scan) {
  var subselect = [], depth = 0, part;
  do {
    subselect.push(part = scan.shift());
    if (part.type == "subselect") depth++;
    else if (part.type == "collection") depth--;
  } while (depth != 0);
  return subselect;
}

exports.compile = function(sql, schema, placeholder) {
  return compile([], scanner.query(sql), schema, placeholder);
}

function subselects (scan, children) {
  var parent = [];
  while (scan.length) {
    if (scan[0].type == "subselect") children.push(subselect(scan));
    else parent.push(scan.shift());
  }
  return parent;
}

function compile (path, scan, schema, placeholder) {
  var all = false,
      children = [], expansions = [], tables = [],
      parents = {}, selected = {},
      $, pivot, through, i, I, token, left, right;
  scan = subselects(scan, children);
  for (i = 0, I = scan.length; i < I; i++) {
    token = scan[i];
    switch (token.type) {
      case "all":
        all = true;
        expansions.push(token);
        break;
      case "tableAll":
        selected[token.table] = true;
        expansions.push(token);
        break;
      case "table":
        tables.push(table = {
          token: token,
          columns: []
        });
        if (all || selected[token.alias]) {
          if (!pivot) {
            pivot = token.alias;
          } else {
            $ = scan.slice(i + 1, i + 3), left = $[0], right = $[1];
            if (left.table === token.alias) {
              parents[left.table] = right.table;
            } else {
              parents[right.table] = left.table;
            }
          }
        } else if (!through) {
          if (scan[i + 1].type === "left") {
            $ = scan.slice(i + 1, i + 3), left = $[0], right = $[1];
            if (left.table === token.alias) {
              through = left;
            } else {
              through = right;
            }
          } else {
            through = token;
          }
        }
    }
  }
  expansions.forEach(function (expansion) {
    expansion.expansions = [];
    if (expansion.type === "all") {
      tables.forEach(function (table) {
        expansion.expansions.push([table.token.schema, table.token.name, table.token.alias]);
      });
    } else {
      tables.forEach(function (table) {
        if (table.token.alias == expansion.table) {
          expansion.expansions.push([table.token.schema, table.token.name, table.token.alias]);
          // break;
        }
      });
    }
  });
  var seen = {}, selected = [], columns = [],
      structure = { temporary: "relatable_temporary_" + (++identifier) },
      _schema, table, alias, parameters = [];
  while (expansions.length) {
    if (expansions[0].expansions.length) {
      $ = expansions[0].expansions.shift(), _schema = $[0], table = $[1], alias = $[2];
      schema[_schema.toLowerCase()][table.toLowerCase()].columns.forEach(function (column) {
        var qualifiedName = "" + alias + "." + column;
        if (!seen[qualifiedName]) {
          columns.push({
            qualifiedName: qualifiedName,
            alias: alias,
            column: column
          });
        }
      });
    } else {
      expansions.shift();
    }
  }
  if (through) {
    if (through.type == "table") {
      parents[through.alias] = pivot;
    } else {
      parents[through.table] = pivot;
      columns.push({
        qualifiedName: "" + through.table + "." + through.column,
        alias: through.table,
        column: through.column
      });
    }
  }
  columns.forEach(function (select) {
    var current = select.alias, prefix = [];
    while (current != null) {
      prefix.push(current);
      current = parents[current];
    }
    prefix.reverse();
    prefix.push(select.column);
    selected.push("" + select.qualifiedName + " AS " + (prefix.join("__")));
  });
  var sql = [], first = true, select, from, join, joined;
  from = select = scan.shift();
  sql.push(select.before);
  sql.push(selected.join(", "));
  structure.join = null;
  while (from.type != "from") {
    from = scan.shift();
  }
  token = scan.shift();
  var index = 0;
  while (path.length && scan[index].type == 'left') {
    if (scan[index].table == token.alias) {
      join = scan[index + 1], first = scan[index];
    } else {
      join = scan[index], first = scan[index + 1];
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path[i].pivot === join.table) {
        if (!index) {
          path[i].joins.push(structure);
          structure.join = {
            table: path[i].pivot,
            fields: {}
          };
        }
        if (through) {
          joined = "" + through.table + "." + through.column;
        } else {
          joined = first.column;
        }
        structure.join.fields[join.column] = joined;
        if (!index) sql.push(" FROM " + path[i].temporary + " AS " + path[i].pivot);
        from.value = "JOIN";
        break;
      }
    }
    join.value = "" + join.table + "." + join.table + "__" + join.column;
    index += 2;
  }
  sql.push(from.before);
  sql.push(from.value);
  sql.push(token.before);
  sql.push(token.value);
  var index = 0;
  scan.forEach(function (token) {
    switch (token.type) {
      case "table":
        sql.push(token.before);
        sql.push(token.value || "");
        break;
      case "left":
      case "right":
      case "rest":
        sql.push(token.before);
        sql.push(token.value || "");
        break;
      case "stuff":
        sql.push(token.before);
        sql.push(token.value || "");
        break;
      case "evaluation":
        parameters.push(new Function("$", 'return ' + token.value));
        sql.push(placeholder(index++));
        break;
      case "parameter":
        parameters.push(function ($) { return $[token.value] });
        sql.push(placeholder(index++));
        break;
    }
  });
  extend(structure, {
    sql: sql.join(""),
    parents: parents,
    pivot: pivot,
    parameters: parameters,
    joins: []
  });
  var compiled = { structure: structure, scan: scan };
  children.forEach(function (child) {
    child.shift();
    compile([structure].concat(path), child, schema, placeholder);
  });
  return compiled;
}
