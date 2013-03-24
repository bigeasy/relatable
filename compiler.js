var scanner = require("./scanner"), identifier = 0, __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  return process.exit(1);
}

function say () { return console.log.apply(console, __slice.call(arguments, 0)) }

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
  } else {
    update = scanner.mutation(definition, true);
    if (splat.length === 2) {
      where = splat[0], object = splat[1];
    } else {
      object = where = splat[0];
    }
    operation = {
      type: "update",
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
  } else {
    mutation = scanner.mutation(definition);
    operation = {
      type: "delete",
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
  } else {
    mutation = scanner.mutation(definition);
    operation = {
      type: type,
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

exports.compile = function(sql, schema, callback) {
  var scan = scanner.query(sql), selects = [[]], count = 0;
  scan.forEach(function (part) {
    selects[0].push(part);
    if (part.type == "subselect") count++;
    if (part.type == "collection") count--;
    if (!count && part.type == "rest") selects.unshift([]);
  });

  var queue = selects.pop(), root = [], depth = 0, subselect, done;
  while (queue.length) {
    if (queue[0].type == "subselect") {
      root.push(queue.shift());
      subselect = [], done = false;
      while (!done && queue.length) {
        if (queue[0].type == "subselect") {
          depth++;
          continue;
        } else if (queue[0].type == "collection") {
          if (depth) {
            depth--;
          } else {
            done = true;
          }
        }
        subselect.push(queue.shift());
      }
      selects.push(subselect);
    } else {
      root.push(queue.shift());
    }
  }

  selects.push(root);
  compileSelect([], selects.pop(), schema, function(error, result) {
    compileSelects([result.structure], selects, schema, callback);
  });
};

function compileSelects (path, selects, schema, callback) {
  if (selects.length == 1) {
    callback(null, { structure: path[0] });
  } else {
    compileSelect(path, selects.pop(), schema, function(error) {
      if (error) callback(error);
      else compileSelects(path, selects, schema, callback);
    });
  }
}

function compileSelect (path, scan, schema, callback) {
  var all = false, expansions = [], tables = [], parents = {}, selected = {},
      $, pivot, through, i, I, token, left, right;
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
        expansion.expansions.push([table.token.name, table.token.alias]);
      });
    } else {
      tables.forEach(function (table) {
        if (table.token.alias == expansion.table) {
          expansion.expansions.push([table.token.name, table.token.alias]);
          // break;
        }
      });
    }
  });
  var seen = {}, selected = [], columns = [],
      structure = { temporary: "relatable_temporary_" + (++identifier) },
      table, alias, parameters = [];
  while (expansions.length) {
    if (expansions[0].expansions.length) {
      $ = expansions[0].expansions.shift(), table = $[0], alias = $[1];
      schema.public[table.toLowerCase()].columns.forEach(function (column) {
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
  if (path.length) {
    if (scan[0].table == token.alias) {
      join = scan[1], first = scan[0];
    } else {
      join = scan[0], first = scan[1];
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path[i].pivot === join.table) {
        path[i].joins.push(structure);
        structure.join = {
          table: path[i].pivot,
          fields: {}
        };
        if (through) {
          joined = "" + through.table + "." + through.column;
        } else {
          joined = first.column;
        }
        structure.join.fields[join.column] = joined;
        sql.push(" FROM " + path[i].temporary + " AS " + path[i].pivot);
        from.value = "JOIN";
        break;
      }
    }
    join.value = "" + join.table + "." + join.table + "__" + join.column;
  }
  sql.push(from.before);
  sql.push(from.value);
  sql.push(token.before);
  sql.push(token.value);
  scan.forEach(function (token) {
    switch (token.type) {
      case "table":
        sql.push(token.before);
        sql.push(token.value || "");
        break;
      case "table":
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
      case "parameter":
        parameters.push(function ($) { return $[token.value] });
        sql.push('?');
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
  callback(null, { structure: structure, scan: scan });
}
