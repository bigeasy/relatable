var compileSelect, compileSelects, extend, identifier, scanner,
  __slice = [].slice;

scanner = require("./scanner");

extend = require("coffee-script").helpers.extend;

identifier = 0;

exports.update = function() {
  var column, definition, key, object, operation, splat, star, update, value, where, _i, _j, _len, _len1, _ref, _ref1;
  definition = arguments[0], splat = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (typeof definition === "object" && splat.length === 0) {
    operation = {
      type: "update"
    };
    for (key in definition) {
      value = definition[key];
      operation[key] = value;
    }
  } else {
    update = scanner.mutation(definition, {
      tableOnly: false
    });
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
    _ref = update.where;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      column = _ref[_i];
      operation.where[column] = where[column];
    }
    if (update.columns.length === 0) {
      star = Object.keys(operation.literals).length === 0;
    } else {
      _ref1 = update.columns;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        column = _ref1[_j];
        if (column === "*") {
          star = true;
          break;
        } else {
          operation.parameters[column] = object[column];
        }
      }
    }
    if (star) {
      for (column in object) {
        value = object[column];
        if (update.where.indexOf(column) === -1) {
          operation.parameters[column] = value;
        }
      }
    }
  }
  return operation;
};

exports["delete"] = function(definition, object) {
  var key, operation, value, _delete, _i, _len, _ref;
  if (typeof definition === "object") {
    operation = {
      type: "delete"
    };
    for (key in definition) {
      value = definition[key];
      operation[key] = value;
    }
  } else {
    _delete = scanner.mutation(definition, {
      tableOnly: true
    });
    operation = {
      type: "delete",
      table: _delete.table,
      where: {}
    };
    if (_delete.where.length === 0) {
      for (key in object) {
        value = object[key];
        operation.where[key] = value;
      }
    } else {
      _ref = _delete.where;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
        operation.where[key] = object[key];
      }
    }
  }
  return operation;
};

exports.insert = function(definition, object) {
  var column, insert, key, operation, star, value, _i, _len, _ref;
  if (typeof definition === "object") {
    operation = {
      type: "insert",
      returning: [],
      parameters: {},
      literals: {}
    };
    for (key in definition) {
      value = definition[key];
      operation[key] = value;
    }
  } else {
    insert = scanner.mutation(definition, {
      tableOnly: true
    });
    operation = {
      type: "insert",
      table: insert.table,
      returning: insert.where,
      parameters: {},
      literals: insert.literals
    };
    if (insert.columns.length === 0) {
      star = !((function() {
        var _results;
        _results = [];
        for (key in insert.literals) {
          _results.push(key);
        }
        return _results;
      })()).length;
    } else {
      _ref = insert.columns;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        column = _ref[_i];
        if (column === "*") {
          star = true;
          break;
        } else {
          operation.parameters[column] = object[column];
        }
      }
    }
    if (star) {
      for (key in object) {
        value = object[key];
        operation.parameters[key] = value;
      }
    }
  }
  return operation;
};

exports.compile = function(sql, schema, callback) {
  var part, scan, selects, _i, _len;
  scan = scanner.query(sql);
  selects = [[]];
  for (_i = 0, _len = scan.length; _i < _len; _i++) {
    part = scan[_i];
    selects[0].push(part);
    if (part.type === "rest") {
      selects.unshift([]);
    }
  }
  return compileSelect([], selects.pop(), schema, function(error, _arg) {
    var structure;
    structure = _arg.structure;
    return compileSelects([structure], selects, schema, callback);
  });
};

compileSelects = function(path, selects, schema, callback) {
  if (selects.length === 1) {
    return callback(null, {
      structure: path[0]
    });
  } else {
    return compileSelect(path, selects.pop(), schema, function(error, _arg) {
      var scan, structure;
      structure = _arg.structure, scan = _arg.scan;
      return compileSelects(path, selects, schema, callback);
    });
  }
};

compileSelect = function(path, scan, schema, callback) {
  var alias, all, column, columns, current, expansion, expansions, first, from, i, join, joined, left, parents, pivot, prefix, qualifiedName, right, seen, select, selected, sql, structure, table, tables, through, token, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _p, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
  _ref = [false, [], [], {}, {}], all = _ref[0], expansions = _ref[1], tables = _ref[2], parents = _ref[3], selected = _ref[4];
  for (i = _i = 0, _len = scan.length; _i < _len; i = ++_i) {
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
            _ref1 = scan.slice(i + 1, i + 3), left = _ref1[0], right = _ref1[1];
            if (left.table === token.alias) {
              parents[left.table] = right.table;
            } else {
              parents[right.table] = left.table;
            }
          }
        } else if (!through) {
          if (scan[i + 1].type === "left") {
            _ref2 = scan.slice(i + 1, i + 3), left = _ref2[0], right = _ref2[1];
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
  for (_j = 0, _len1 = expansions.length; _j < _len1; _j++) {
    expansion = expansions[_j];
    expansion.expansions = [];
    if (expansion.type === "all") {
      for (_k = 0, _len2 = tables.length; _k < _len2; _k++) {
        table = tables[_k];
        expansion.expansions.push([table.token.name, table.token.alias]);
      }
    } else {
      for (_l = 0, _len3 = tables.length; _l < _len3; _l++) {
        table = tables[_l];
        if (table.token.alias === expansion.table) {
          expansion.expansions.push([table.token.name, table.token.alias]);
          break;
        }
      }
    }
  }
  _ref3 = [{}, [], []], seen = _ref3[0], selected = _ref3[1], columns = _ref3[2];
  structure = {
    temporary: "relatable_temporary_" + (++identifier)
  };
  while (expansions.length) {
    if (expansions[0].expansions.length) {
      _ref4 = expansions[0].expansions.shift(), table = _ref4[0], alias = _ref4[1];
      _ref5 = schema[table];
      for (_m = 0, _len4 = _ref5.length; _m < _len4; _m++) {
        column = _ref5[_m];
        qualifiedName = "" + alias + "." + column;
        if (!seen[qualifiedName]) {
          columns.push({
            qualifiedName: qualifiedName,
            alias: alias,
            column: column
          });
        }
      }
    } else {
      expansions.shift();
    }
  }
  if (through) {
    if (through.type === "table") {
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
  for (_n = 0, _len5 = columns.length; _n < _len5; _n++) {
    select = columns[_n];
    current = select.alias;
    prefix = [];
    while (current != null) {
      prefix.push(current);
      current = parents[current];
    }
    prefix.reverse();
    prefix.push(select.column);
    selected.push("" + select.qualifiedName + " AS " + (prefix.join("__")));
  }
  sql = [];
  from = select = scan.shift();
  sql.push(select.before);
  sql.push(selected.join(", "));
  first = true;
  structure.join = null;
  while (from.type !== "from") {
    from = scan.shift();
  }
  token = scan.shift();
  if (path.length) {
    _ref6 = scan[0].table === token.alias ? [scan[1], scan[0]] : [scan[0], scan[1]], join = _ref6[0], first = _ref6[1];
    for (i = _o = _ref7 = path.length - 1; _ref7 <= 0 ? _o <= 0 : _o >= 0; i = _ref7 <= 0 ? ++_o : --_o) {
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
  for (i = _p = 0, _len6 = scan.length; _p < _len6; i = ++_p) {
    token = scan[i];
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
    }
  }
  extend(structure, {
    sql: sql.join(""),
    parents: parents,
    pivot: pivot,
    joins: []
  });
  return callback(null, {
    structure: structure,
    scan: scan
  });
};
