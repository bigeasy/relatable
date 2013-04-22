var fs = require('fs'),
    path = require('path'),
    ok = require('assert').ok,
    __slice = [].slice,
    compiler = require("./compiler"),
    cadence = require('cadence');

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  process.exit(1);
}

function say () { console.log.apply(console, __slice.call(arguments, 0)) }

function extend (to, from) {
  for (var key in from) to[key] = from[key];
  return to;
}

Selection.name = 'Selection';

function Selection (relatable, schema, connection, strings, parameters, close) {
  this.relatable = relatable;
  this.schema = schema;
  this.connection = connection;
  this.strings = strings;
  this.parameters = parameters;
  this.close = close;
  this.cleanup = [];
  this.completed = {};
}

Selection.prototype.execute = cadence(function (step) {
  step(function () {

    if (this.strings.length == 1 && /^\s*select\s/i.test(this.strings[0])) {
      return this.strings[0];
    } else {
      fs.readFile(path.join.apply(path, this.strings), 'utf8', step());
    }

  }, function (sql) {

    var compilation = compiler.compile(sql, this.schema, this.connection._placeholder);
    this.select([compilation.structure], step());

  });
});

Selection.prototype.complete = cadence(function (step) {
  step(function () {
    if (this.cleanup.length) {
      this.connection.sql(this.cleanup.shift(), [], step());
    }
  }, function () {
    if (this.close) {
      this.connection.close("ROLLBACK", step());
    }
  }, function () {
    return this.results;
  });
});

Selection.prototype.join = function (structures, expanded, callback) {
  var selection = this, structure = structures.shift();
  selection.completed[structure.pivot] = expanded;
  structures.push.apply(structures, structure.joins);
  if (structures.length) {
    selection.select(structures, callback);
  } else {
    selection.complete(callback);
  }
};

Selection.prototype._get = function (record, key) {
  var path = key.split(/\./);
  while (path.length > 1) {
    record = record != null ? record[path.shift()] : void 0;
  }
  return record != null ? record[path.shift()] : void 0;
};

Selection.prototype.gather = cadence(function (step, sql, structures, parameters) {
  step(function () {
    this.connection.sql(sql, parameters, step());
  }, function (results) {
    var selection = this, pivot, expanded, tree, join, joins,
        fields, map, keys, current, parent, i, I;
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
    selection.join(structures, expanded, step());
  });
});

Selection.prototype.temporary = cadence(function (step, structures, prepare) {
  var next;
  step(next = function () {
    var parameters = prepare.shift().concat(step());
    this.connection.sql.apply(this.connection, parameters);

  }, function () {

    if (prepare.length) step(next)();
    else this.gather('\
        SELECT * \
        FROM ' + structures[0].temporary + ' \
       ORDER \
          BY ' + structures[0].temporary + '_row_number \
      ', structures, [], step());

  });
});

Selection.prototype.select = function (structures, callback) {
  var parameters = this.parameters;
  parameters = structures[0].parameters.map(function (parameter) {
    return parameter(parameters)
  });
  if (structures[0].joins.length) {
    var prepare = this.relatable._engine.temporary(structures[0], parameters);
    this.cleanup.push("DROP TABLE " + structures[0].temporary);
    this.temporary(structures, prepare, callback);
  } else {
    this.gather(structures[0].sql, structures, parameters, callback);
  }
};

Selection.prototype.treeify = function (record, get) {
  var selection = this, i, I, key, part, parts, tree = {}, value, branch;
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

Mutator.prototype._connect = cadence(function (step) {
  step(function () {
    this.connected = true;
    this.relatable._engine.connect(step());
  }, function (schema, connection) {
    this.schema = schema;
    this.connection = connection;
    step(function () {
      connection.mutate(step());
    }, function () {
      this._dequeue();
    });
  });
});

Mutator.prototype._dequeue = function () {
  var mutator = this;
  if (mutator.error) {
    while (mutator.queue.length) {
      var operation = mutator.queue.shift();
      if (operation.callback) operation.callback(mutator.error);
    }
  } else if (!mutator.connected) {
    mutator._connect(function (error) {
      if (error) {
        mutator.error = error;
        mutator._dequeue();
      }
    });
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
      mutator.connection.close("ROLLBACK", function (error) {
        if (error) mutator.error = error;
        if (operation.callback) operation.callback(error, mutator.results);
        delete mutator.connected;
      });
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

Mutator.prototype.rollback = function (callback) {
  var mutator = this;
  mutator._enqueue({ type: "rollback" }, callback);
}

Mutator.prototype.sql = function (sql) {
  var mutator = this, shiftable = __slice.call(arguments, 1), object = {}, callback;
  if (shiftable.length && (typeof shiftable[shiftable.length - 1] == "function")) {
    callback = shiftable.pop();
  }
  mutator._enqueue({ type: 'raw', sql: sql, parameters: shiftable }, callback);
};

Mutator.prototype.select = function () {
  var mutator = this, sql, shiftable = __slice.call(arguments), strings = [], callback;
  if (typeof shiftable[shiftable.length - 1] == "function") {
    callback = shiftable.pop();
  }
  while (typeof shiftable[0] == "string") {
    strings.push(shiftable.shift());
  }
  shiftable = shiftable[0] || {};
  mutator._enqueue({ type: 'select', strings: strings, parameters: shiftable }, callback);
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

Relatable.prototype.select = cadence(function (step) {
  var parameters = __slice.call(arguments, 1), strings = [];
  step(function () {
    while (typeof parameters[0] == "string") {
      strings.push(parameters.shift());
    }
    parameters = parameters[0] || {};
    this._engine.connect(step());
  }, function (schema, connection) {
    this._select(schema, connection, strings, parameters, true, step());
  });
});

Relatable.prototype._select = function (schema, connection, strings, parameters, close, callback) {
  new Selection(this, schema, connection, strings, parameters, close).execute(callback);
}

Relatable.prototype.mutate = function () {
  return new Mutator(this);
};

Relatable.prototype.sql = cadence(function (step) {
  var parameters = __slice.call(arguments, 1), sql = parameters.shift();
  step(function () {
    if (parameters.length && Array.isArray(parameters[0])) {
      parameters = parameters[0];
    }
    this._engine.connect(step());
  }, function (schema, connection) {
    step(function () {
      connection.sql(sql, parameters, step());
    }, function (results) {
      step(function () {
        connection.close("COMMIT", step());
      }, function () {
        return results;
      });
      //step()(null, results);
      //connection.close("COMMIT", step());
      // return results; TODO MAKE THIS HAPPEN
    });
  });
});
