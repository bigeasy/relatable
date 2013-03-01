var __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  return process.exit(1);
}

function say () { return console.log.apply(console, __slice.call(arguments, 0)) }

Mutator.name = 'Mutator';

function Mutator() {}

exports.Mutator = Mutator;

Mutator.prototype.raw = function(mutation, operation) {
  var relatable;
  relatable = mutation.mutator.relatable;
  return this.sql(operation.sql, operation.parameters, function(error, results) {
    if (error) {
      return mutation.callback(error);
    } else {
      mutation.results.push(results);
      return mutation.mutate();
    }
  });
};

Mutator.prototype.select = function(mutation, operation) {
  var callback, relatable;
  relatable = mutation.mutator.relatable;
  callback = function(error, results) {
    if (error) {
      return mutation.callback(error);
    } else {
      mutation.results.push(results);
      return mutation.mutate();
    }
  };
  return relatable._select(mutation.schema, mutation.connection, operation.sql, operation.parameters, false, callback);
};

Mutator.prototype.insertIf = function (mutation, operation, callback) {
  var mutator = this,
      relatable = mutation.relatable,
      table = operation.table,
      schema = mutation.schema.public[table.toLowerCase()],
      parameters = Object.keys(operation.parameters),
      literals = Object.keys(operation.literals),
      into = parameters.concat(literals)
                       .map(function (key) { return relatable._toSQL(key) }),
      values = parameters.map(function (_, index) { return mutator._placeholder(index) })
                         .concat(literals.map(function (key) { operation.literals[key] })),
      where = operation.where.map(function (key, index) {
                return key + " = " + mutator._placeholder(values.length + index)
              }),
      sql = "\
    INSERT INTO " + (relatable._toSQL(table)) + " (" + (into.join(", ")) + ")\n\
    SELECT " + (values.join(", ")) + "\n\
    FROM " + (relatable._toSQL(table)) + "\n\
    WHERE NOT EXISTS (\n\
      SELECT 1\n\
      FROM " + (relatable._toSQL(table)) + "\n\
      WHERE " + where.join(" AND ") + "\n\
    )\n\
    ";
  values = parameters.map(function(key) {
    return operation.parameters[key];
  }).concat(operation.where.map(function (key) {
    return operation.parameters[key];
  }));
  sql = mutator._returning(relatable, sql, schema);
  mutator.sql(sql, values, function(error, results) {
    if (error) callback(error);
    else callback(null, mutator._inserted(results, schema));
  });
}

Mutator.prototype.insert = function(mutation, operation, callback) {
  var mutator = this,
      relatable = mutation.relatable,
      table = operation.table,
      schema = mutation.schema.public[table.toLowerCase()],
      parameters = Object.keys(operation.parameters),
      literals = Object.keys(operation.literals),
      into = parameters.concat(literals)
                       .map(function (key) { return relatable._toSQL(key) }),
      values = parameters.map(function (_, index) { return mutator._placeholder(index) })
                         .concat(literals.map(function (key) { return operation.literals[key] })),
      sql = "\
    INSERT INTO " + (relatable._toSQL(table)) + " (" + (into.join(", ")) + ")\n\
    VALUES(" + values.join(", ") + ")\n\
    ";
  values = parameters.map(function(key) {
    return operation.parameters[key];
  });
  sql = mutator._returning(relatable, sql, schema);
  mutator.sql(sql, values, function(error, results) {
    if (error) callback(error);
    else callback(null, mutator._inserted(results, schema));
  });
};

Mutator.prototype.update = function(mutation, operation, callback) {
  var exists, i, k, key, literals, parameters, relatable, set, setOrder, sql, table, v, where, whereOrder, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1,
    _this = this;
  relatable = mutation.relatable;
  table = operation.table, where = operation.where, parameters = operation.parameters, literals = operation.literals;
  table = relatable._toSQL(table);
  exists = {};
  _ref = mutation.schema.public[table.toLowerCase()].columns;
  // **TODO**: Case sensitivity.
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    key = _ref[_i];
    exists[key.toLowerCase()] = true;
  }
  for (key in operation.parameters) {
    key = relatable._toSQL(key);
    if (!exists[key.toLowerCase()]) {
      delete operation.parameters[key];
    }
  }
  setOrder = Object.keys(operation.parameters);
  set = [];
  for (i = _j = 0, _len1 = setOrder.length; _j < _len1; i = ++_j) {
    k = setOrder[i];
    set.push("" + (relatable._toSQL(k)) + " = " + (this._placeholder(i)));
  }
  _ref1 = operation.literals;
  for (k in _ref1) {
    v = _ref1[k];
    set.push("" + (relatable._toSQL(k)) + " = " + v);
  }
  whereOrder = Object.keys(operation.where);
  where = [];
  for (i = _k = 0, _len2 = whereOrder.length; _k < _len2; i = ++_k) {
    k = whereOrder[i];
    where.push("" + (relatable._toSQL(k)) + " = " + (this._placeholder(setOrder.length + i)));
  }
  sql = "UPDATE " + table + "\n   SET " + (set.join(", ")) + "\n WHERE " + (where.join(" AND "));
  parameters = [];
  for (_l = 0, _len3 = setOrder.length; _l < _len3; _l++) {
    key = setOrder[_l];
    parameters.push(operation.parameters[key]);
  }
  for (_m = 0, _len4 = whereOrder.length; _m < _len4; _m++) {
    key = whereOrder[_m];
    parameters.push(operation.where[key]);
  }
  return this.sql(sql, parameters, function(error, results) {
    if (error) {
      return callback(error);
    } else {
      return callback(null, _this._updated(results));
    }
  });
};

Mutator.prototype["delete"] = function(mutation, operation, callback) {
  var conditions, key, parameters, relatable, selected, sql, table, where, _i, _len,
    _this = this;
  relatable = mutation.relatable;
  table = operation.table, where = operation.where;
  selected = Object.keys(where);
  conditions = selected.map(function(k, i) {
    return "" + (relatable._toSQL(k)) + " = " + (_this._placeholder(i));
  });
  sql = "DELETE FROM " + (relatable._toSQL(table)) + "\n      WHERE " + (conditions.join(" AND "));
  parameters = [];
  for (_i = 0, _len = selected.length; _i < _len; _i++) {
    key = selected[_i];
    parameters.push(where[key]);
  }
  return this.sql(sql, parameters, function(error, results) {
    if (error) {
      return callback(error);
    } else {
      return callback(null, _this._deleted(results));
    }
  });
};
