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

Selection.prototype.execute = function() {
  var selection = this;
  compiler.compile(selection.sql, selection.schema, function(error, result) {
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

Selection.prototype.complete = function() {
  var _this = this;
  if (this.cleanup.length) {
    return this.connection.sql(this.cleanup.shift(), [], function(error, results) {
      if (error) {
        return _this.callback(error);
      } else {
        return _this.complete();
      }
    });
  } else {
    if (this.close) {
      this.connection.close("ROLLBACK", function() {});
    }
    return this.callback(null, this.results);
  }
};

Selection.prototype.join = function(structures, expanded) {
  var join, structure, _i, _len, _ref;
  structure = structures.shift();
  this.completed[structure.pivot] = expanded;
  _ref = structure.joins;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    join = _ref[_i];
    structures.push(join);
  }
  if (structures.length) {
    return this.select(structures);
  } else {
    return this.complete();
  }
};

Selection.prototype._get = function(record, key) {
  var path;
  path = key.split(/\./);
  while (path.length > 1) {
    record = record != null ? record[path.shift()] : void 0;
  }
  return record != null ? record[path.shift()] : void 0;
};

Selection.prototype.gather = function(sql, structures, parameters) {
  var _this = this;
  return this.connection.sql(sql, parameters, function(error, results) {
    var current, expanded, fields, i, join, joins, keys, map, parent, pivot, record, result, tree, _i, _j, _k, _l, _len, _len1, _len2, _len3, _m, _n, _name, _name1, _ref, _ref1, _ref2, _ref3;
    if (error) {
      return _this.callback(error);
    } else {
      if (pivot = structures[0].pivot) {
        expanded = [];
        joins = structures[0].joins || [];
        _ref = results.rows || results;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          result = _ref[_i];
          tree = _this.treeify(result, pivot);
          for (_j = 0, _len1 = joins.length; _j < _len1; _j++) {
            join = joins[_j];
            tree[_this.relatable._toJavaScript(join.pivot)] = [];
          }
          expanded.push(tree);
        }
      } else {
        expanded = results.rows || results;
      }
      if (pivot && structures[0].join) {
        join = structures[0].join;
        fields = join.fields;
        map = {};
        keys = Object.keys(fields);
        _ref1 = _this.completed[join.table];
        for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
          record = _ref1[_k];
          current = map;
          for (i = _l = 0, _ref2 = keys.length - 1; 0 <= _ref2 ? _l < _ref2 : _l > _ref2; i = 0 <= _ref2 ? ++_l : --_l) {
            current = current[_name = record[keys[i]]] || (current[_name] = {});
          }
          current[record[_this.relatable._toJavaScript(keys[keys.length - 1])]] = record;
        }
        for (_m = 0, _len3 = expanded.length; _m < _len3; _m++) {
          record = expanded[_m];
          current = map;
          for (i = _n = 0, _ref3 = keys.length - 1; 0 <= _ref3 ? _n < _ref3 : _n > _ref3; i = 0 <= _ref3 ? ++_n : --_n) {
            current = current[_name1 = record[fields[keys[i]]]] || (current[_name1] = {});
          }
          parent = current[_this._get(record, _this.relatable._toJavaScript(fields[keys[keys.length - 1]]))];
          parent[_this.relatable._toJavaScript(pivot)].push(record);
        }
      } else {
        _this.results = expanded;
      }
      return _this.join(structures, expanded);
    }
  });
};

Selection.prototype.temporary = function(structures, prepare) {
  var sql,
    _this = this;
  if (prepare.length) {
    return this.connection.sql.apply(this.connection, prepare.shift().concat(function(error, results) {
      if (error) {
        return _this.callback(error);
      } else {
        return _this.temporary(structures, prepare);
      }
    }));
  } else {
    sql = "SELECT *\n  FROM " + structures[0].temporary + "\n ORDER\n    BY " + structures[0].temporary + "_row_number";
    return this.gather(sql, structures, []);
  }
};

Selection.prototype.select = function(structures) {
  var parameters, prepare;
  parameters = this.parameters[structures[0].pivot] || [];
  if (structures[0].joins.length) {
    prepare = this.relatable._engine.temporary(structures[0], parameters);
    this.cleanup.push("DROP TABLE " + structures[0].temporary);
    return this.temporary(structures, prepare);
  } else {
    return this.gather(structures[0].sql, structures, parameters);
  }
};

Selection.prototype.treeify = function(record, get) {
  var branch, i, key, part, parts, tree, value, _i, _ref;
  tree = {};
  for (key in record) {
    value = record[key];
    parts = key.split(/__/);
    branch = tree;
    for (i = _i = 0, _ref = parts.length - 1; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      part = this.relatable._toJavaScript(parts[i]);
      branch = branch[part] = branch[part] || {};
    }
    branch[this.relatable._toJavaScript(parts[parts.length - 1])] = record[key];
  }
  return tree[this.relatable._toJavaScript(get)];
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
      });
      break;
    case "rollback":
      break;
    default:
      mutator.connection[operation.type](this, operation, function (error, result) {
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

Mutator.prototype._subset = function(object, keys) {
  var key, subset, _i, _len;
  subset = {};
  for (_i = 0, _len = keys.length; _i < _len; _i++) {
    key = keys[_i];
    subset[key] = object[key];
  }
  return subset;
};

Mutator.prototype._fixupObject = function(object) {
  return object;
};

Mutator.prototype.sql = function(sql, parameters) {
  if (parameters == null) {
    parameters = [];
  }
  return this.operations.push({
    type: "raw",
    sql: sql,
    parameters: parameters
  });
};

Mutator.prototype.select = function() {
  var parameters, sql;
  sql = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (parameters.length === 1 && Array.isArray(parameters[0])) {
    parameters = parameters[0];
  }
  return this.operations.push({
    type: "select",
    sql: sql,
    parameters: parameters
  });
};

Mutator.prototype._enqueue = function(operation, callback) {
  var mutator = this;
  operation.callback = callback;
  mutator.queue.push(operation);
  if (mutator.queue.length == 1) mutator._dequeue();
}

Mutator.prototype.insert = function(pattern) {
  var mutator = this, shiftable = __slice.call(arguments, 1), object = {}, callback;
  if (shiftable.length && (typeof shiftable[0] == "object")) {
    object = shiftable.shift();
  }
  mutator._enqueue(compiler.insert(pattern, object), shiftable.shift());
}

Mutator.prototype.update = function(pattern) {
  var mutator = this, shiftable = __slice.call(arguments, 1), callback; 
  if (typeof shiftable[shiftable.length - 1] == "function") {
    callback = shiftable.pop();
  }
  mutator._enqueue(compiler.update.apply(compiler, [pattern].concat(shiftable)), callback);
}

Mutator.prototype["delete"] = function(pattern, object, callback) {
  var mutator = this, shiftable = __slice.call(arguments, 1), object = {}, callback;
  if (shiftable.length && (typeof shiftable[0] == "object")) {
    object = shiftable.shift();
  }
  mutator._enqueue(compiler.delete(pattern, object), callback);
}

Mutator.prototype.execute = function(callback) {
  var _this = this;
  return this.relatable._engine.connect(function(error, schema, connection) {
    var mutation;
    if (error) {
      return callback(error);
    } else {
      mutation = new Mutation(_this, schema, connection, _this.operations, callback);
      return mutation.mutate();
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

Relatable.prototype._toJavaScript = function(column, capitalize) {
  var fixed, i, parts, start, _i, _j, _ref;
  start = capitalize ? 0 : 1;
  if (this._fixup) {
    fixed = [];
    parts = column.split(/_/);
    for (i = _i = 0; 0 <= start ? _i < start : _i > start; i = 0 <= start ? ++_i : --_i) {
      fixed.push(parts[i]);
    }
    for (i = _j = start, _ref = parts.length; start <= _ref ? _j < _ref : _j > _ref; i = start <= _ref ? ++_j : --_j) {
      fixed.push(parts[i].substring(0, 1).toUpperCase());
      fixed.push(parts[i].substring(1));
    }
    return fixed.join("");
  } else {
    return column;
  }
};

Relatable.prototype._toSQL = function(field) {
  var char, i, lower, sql, upper, _i, _ref;
  if (this._fixup) {
    sql = [field[0].toLowerCase()];
    for (i = _i = 1, _ref = field.length; 1 <= _ref ? _i < _ref : _i > _ref; i = 1 <= _ref ? ++_i : --_i) {
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

Relatable.prototype.select = function() {
  var callback, parameters, sql,
    _this = this;
  sql = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  callback = parameters.pop();
  if (parameters.length === 1 && typeof parameters[0] === "object") {
    parameters = parameters[0];
  }
  return this._engine.connect(function(error, schema, connection) {
    return _this._select(schema, connection, sql, parameters, true, callback);
  });
};

Relatable.prototype._select = function(schema, connection, sql, parameters, close, callback) {
  var selection;
  selection = new Selection(this, schema, connection, sql, parameters, close, callback);
  return selection.execute();
};

Relatable.prototype.mutate = function() {
  return new Mutator(this);
};

Relatable.prototype.sql = function() {
  var callback, parameters, sql, _i,
    _this = this;
  sql = arguments[0], parameters = 3 <= arguments.length ? __slice.call(arguments, 1, _i = arguments.length - 1) : (_i = 1, []), callback = arguments[_i++];
  if (parameters.length && Array.isArray(parameters[0])) {
    parameters = parameters[0];
  }
  return this._engine.connect(function(error, schema, connection) {
    if (error) {
      return callback(error);
    } else {
      return connection.sql(sql, parameters, function(error, results) {
        if (error) {
          return callback(error);
        } else {
          return connection.close("COMMIT", function(error) {
            if (error) {
              return callback(error);
            } else {
              return callback(null, results);
            }
          });
        }
      });
    }
  });
};

Relatable.prototype.fetch = function(key, callback) {
  return callback(false);
};
