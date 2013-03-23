var compiler = require("./compiler"), __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  return process.exit(1);
}

function say () { return console.log.apply(console, __slice.call(arguments, 0)) }

function extend (to, from) {
  for (var key in from) to[key] = from[key];
  return to;
}

Selection.name = 'Selection';

function Selection(relatable, schema, connection, sql, parameters, close, callback) {
  this.relatable = relatable;
  this.schema = schema;
  this.connection = connection;
  this.sql = sql;
  this.parameters = parameters;
  this.close = close;
  this.callback = callback;
  this.cleanup = [];
  this.completed = {};
}

Selection.prototype.execute = function () {
  var selection = this;
  compiler.compile(selection.sql, selection.schema, function (error, result) {
    var parameters, structure;
    structure = result.structure;
    if (Array.isArray(selection.parameters)) {
      parameters = {};
      parameters[structure.pivot] = selection.parameters;
      selection.parameters = parameters;
    }
    selection.select([structure]);
  });
};

Selection.prototype.complete = function () {
  var selection = this;
  if (selection.cleanup.length) {
    selection.connection.sql(selection.cleanup.shift(), [], function (error, results) {
      if (error) selection.callback(error);
      else selection.complete();
    });
  } else {
    if (selection.close) {
      selection.connection.close("ROLLBACK", function () {});
    }
    selection.callback(null, selection.results);
  }
};

Selection.prototype.join = function (structures, expanded) {
  var selection = this, structure = structures.shift();
  selection.completed[structure.pivot] = expanded;
  structures.push.apply(structures, structure.joins);
  if (structures.length) {
    return selection.select(structures);
  } else {
    return selection.complete();
  }
};

Selection.prototype._get = function (record, key) {
  var path = key.split(/\./);
  while (path.length > 1) {
    record = record != null ? record[path.shift()] : void 0;
  }
  return record != null ? record[path.shift()] : void 0;
};

Selection.prototype.gather = function (sql, structures, parameters) {
  var selection = this;
  selection.connection.sql(sql, parameters, function (error, results) {
    var pivot, expanded, tree, join, joins,
        fields, map, keys, current, parent, i, I;
    if (error) {
      selection.callback(error);
    } else {
      if (pivot = structures[0].pivot) {
        expanded = [], joins = structures[0].joins || [];
        (results.rows || results).forEach(function (result) {
          tree = selection.treeify(result, pivot);
          joins.forEach(function (join) {
            tree[selection.relatable._toJavaScript(join.pivot)] = [];
          });
          expanded.push(tree);
        });
      } else {
        expanded = results.rows || results;
      }
      if (pivot && structures[0].join) {
        join = structures[0].join, fields = join.fields, map = {}, keys = Object.keys(fields);
        selection.completed[join.table].forEach(function (record) {
          current = map;
          for (i = 0, I = keys.length - 1; i < I; i++) {
            current = current[record[keys[i]]] || (current[record[keys[i]]] = {});
          }
          current[record[selection.relatable._toJavaScript(keys[keys.length - 1])]] = record;
        });
        expanded.forEach(function (record) {
          current = map;
          for (i = 0, I = keys.length - 1; i < I; i++) {
            current = current[record[fields[keys[i]]]] || (current[record[fields[keys[i]]]] = {});
          }
          parent = current[selection._get(record, selection.relatable._toJavaScript(fields[keys[keys.length - 1]]))];
          parent[selection.relatable._toJavaScript(pivot)].push(record);
        });
      } else {
        selection.results = expanded;
      }
      selection.join(structures, expanded);
    }
  });
};

Selection.prototype.temporary = function (structures, prepare) {
  var selection = this, sql;
  if (prepare.length) {
    selection.connection.sql.apply(selection.connection,
      prepare.shift().concat(function (error, results) {
      if (error) selection.callback(error);
      else selection.temporary(structures, prepare);
    }));
  } else {
    sql = "\
      SELECT *\n\
      FROM " + structures[0].temporary + "\n\
     ORDER\n\
        BY " + structures[0].temporary + "_row_number";
    selection.gather(sql, structures, []);
  }
};

Selection.prototype.select = function (structures) {
  var selection = this, parameters, prepare;
  parameters = selection.parameters[structures[0].pivot] || [];
  if (structures[0].joins.length) {
    prepare = selection.relatable._engine.temporary(structures[0], parameters);
    selection.cleanup.push("DROP TABLE " + structures[0].temporary);
    selection.temporary(structures, prepare);
  } else {
    selection.gather(structures[0].sql, structures, parameters);
  }
};

Selection.prototype.treeify = function (record, get) {
  var selection = this, i, I, key, part, parts, tree = {}, value, branch;
  tree = {};
  for (key in record) {
    value = record[key];
    parts = key.split(/__/);
    branch = tree;
    for (i = 0, I = parts.length - 1; i < I; i++) {
      part = selection.relatable._toJavaScript(parts[i]);
      branch = branch[part] = branch[part] || {};
    }
    branch[selection.relatable._toJavaScript(parts[parts.length - 1])] = record[key];
  }
  return tree[selection.relatable._toJavaScript(get)];
};

Mutator.name = 'Mutator';

function Mutator(relatable, schema, connection) {
  this.relatable = relatable;
  this.schema = schema;
  this.connection = connection;
  this.queue = [];
  this.results = [];
}

Mutator.prototype._connect = function () {
  var mutator = this;
  mutator.connected = true;
  mutator.relatable._engine.connect(function (error, schema, connection) {
    mutator.schema = schema;
    mutator.connection = connection;
    mutator._dequeue();
  });
}

Mutator.prototype._dequeue = function () {
  var mutator = this;
  if (!mutator.connected) {
    mutator._connect();
  } else if (mutator.queue.length) {
    var operation = mutator.queue[0];
    switch (operation.type) {
    case "commit":
      mutator.connection.close("COMMIT", function (error) {
        if (error) mutator.error = error;
        if (operation.callback) operation.callback(error, mutator.results);
        delete mutator.connected;
      });
      break;
    case "rollback":
      break;
    default:
      mutator.connection[operation.type](mutator, operation, function (error, result) {
        if (error) mutator.error = error;
        else mutator.results.push(result);
        if (operation.callback) operation.callback.apply(null, arguments);
        mutator.queue.shift();
        mutator._dequeue();
      });
      break;
    }
  }
}

Mutator.prototype.commit = function (callback) {
  var mutator = this;
  mutator._enqueue({ type: "commit" }, callback);
}

Mutator.prototype.rollback = function () {
}

Mutator.prototype.sql = function (sql, parameters) {
  var mutator = this;
  if (parameters == null) {
    parameters = [];
  }
  mutator.operations.push({
    type: "raw",
    sql: sql,
    parameters: parameters
  });
};

Mutator.prototype.select = function () {
  var mutator = this, sql, parameters = __slice.call(arguments), sql = parameters.shift();
  if (parameters.length === 1 && Array.isArray(parameters[0])) {
    parameters = parameters[0];
  }
  return mutator.operations.push({
    type: "select",
    sql: sql,
    parameters: parameters
  });
};

Mutator.prototype._enqueue = function (operation, callback) {
  var mutator = this;
  operation.callback = callback;
  mutator.queue.push(operation);
  if (mutator.queue.length == 1) mutator._dequeue();
}

Mutator.prototype.insert = function (pattern) {
  var mutator = this, shiftable = __slice.call(arguments, 1), object = {}, callback;
  if (shiftable.length && (typeof shiftable[0] == "object")) {
    object = shiftable.shift();
  }
  mutator._enqueue(compiler.insert(pattern, object), shiftable.shift());
}

Mutator.prototype.insertIf = function (pattern) {
  var mutator = this, shiftable = __slice.call(arguments, 1), object = {}, callback;
  if (shiftable.length && (typeof shiftable[0] == "object")) {
    object = shiftable.shift();
  }
  mutator._enqueue(compiler.insert(pattern, object, "insertIf"), shiftable.shift());
}

Mutator.prototype.update = function (pattern) {
  var mutator = this, shiftable = __slice.call(arguments, 1), callback;
  if (typeof shiftable[shiftable.length - 1] == "function") {
    callback = shiftable.pop();
  }
  mutator._enqueue(compiler.update.apply(compiler, [pattern].concat(shiftable)), callback);
}

Mutator.prototype["delete"] = function (pattern, object, callback) {
  var mutator = this, shiftable = __slice.call(arguments, 1), object = {}, callback;
  if (shiftable.length && (typeof shiftable[0] == "object")) {
    object = shiftable.shift();
  }
  mutator._enqueue(compiler.delete(pattern, object), callback);
}

Mutator.prototype.execute = function (callback) {
  var mutator = this;
  mutator.relatable._engine.connect(function (error, schema, connection) {
    var mutation;
    if (error) {
      callback(error);
    } else {
      mutation = new Mutation(mutator, schema, connection, mutator.operations, callback);
      mutation.mutate();
    }
  });
};

exports.Relatable = Relatable;

Relatable.name = 'Relatable';

function Relatable(configuration) {
  this._engine = new (require(configuration.engine).Engine)(configuration);
  this._fixup = configuration.fixup;
  this._acronyms = configuration.acronyms;
}

Relatable.prototype._toJavaScript = function (column, capitalize) {
  var relatable = this, fixed, i, parts, start, I;
  start = capitalize ? 0 : 1;
  if (relatable._fixup) {
    fixed = [];
    parts = column.split(/_/);
    for (i = 0; i < start; i++) {
      fixed.push(parts[i]);
    }
    for (i = start, I = parts.length; i < I; i++) {
      fixed.push(parts[i].substring(0, 1).toUpperCase());
      fixed.push(parts[i].substring(1));
    }
    return fixed.join("");
  } else {
    return column;
  }
};

Relatable.prototype._toSQL = function (field) {
  var relatable = this, char, i, lower, sql, upper, I;
  if (relatable._fixup) {
    sql = [field[0].toLowerCase()];
    for (i = 1, I = field.length; i < I; i++) {
      char = field[i];
      lower = char.toLowerCase();
      upper = char.toUpperCase();
      if (lower !== upper && upper === char) {
        sql.push("_");
      }
      sql.push(lower);
    }
    return sql.join("");
  } else {
    return field;
  }
};

Relatable.prototype.select = function () {
  var relatable = this,
      parameters = __slice.call(arguments),
      sql = parameters.shift(),
      callback = parameters.pop();
  if (parameters.length === 1 && typeof parameters[0] === "object") {
    parameters = parameters[0];
  }
  relatable._engine.connect(function (error, schema, connection) {
    relatable._select(schema, connection, sql, parameters, true, callback);
  });
};

Relatable.prototype._select = function (schema, connection, sql, parameters, close, callback) {
  new Selection(this, schema, connection, sql, parameters, close, callback).execute();
};

Relatable.prototype.mutate = function () {
  return new Mutator(this);
};

Relatable.prototype.sql = function () {
  var relatable = this,
      parameters = __slice.call(arguments),
      sql = parameters.shift(),
      callback = parameters.pop();
  if (parameters.length && Array.isArray(parameters[0])) {
    parameters = parameters[0];
  }
  relatable._engine.connect(function (error, schema, connection) {
    if (error) {
      callback(error);
    } else {
      connection.sql(sql, parameters, function (error, results) {
        if (error) {
          callback(error);
        } else {
          connection.close("COMMIT", function (error) {
            if (error) {
              callback(error);
            } else {
              callback(null, results);
            }
          });
        }
      });
    }
  });
};

Relatable.prototype.fetch = function (key, callback) {
  return callback(false);
};
