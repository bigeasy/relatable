exports.Mutator = (function() {

  Mutator.name = 'Mutator';

  function Mutator() {}

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

  Mutator.prototype.insert = function(mutation, operation, callback) {
    var i, into, key, keys, literals, parameters, relatable, returning, sql, table, values, _i, _j, _len, _len1, _ref, _ref1,
      _this = this;
    relatable = mutation.relatable;
    table = operation.table, returning = operation.returning, parameters = operation.parameters, literals = operation.literals;
    keys = {
      parameters: Object.keys(parameters),
      literals: Object.keys(literals)
    };
    into = keys.parameters.concat(keys.literals).map(function(key) {
      return relatable._toSQL(key);
    });
    values = [];
    _ref = keys.parameters;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      key = _ref[i];
      values.push(this._placeholder(i));
    }
    _ref1 = keys.literals;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      key = _ref1[_j];
      values.push(literals[key]);
    }
    sql = "INSERT INTO " + (relatable._toSQL(table)) + " (" + (into.join(", ")) + ")\nVALUES(" + (values.join(", ")) + ")";
    if (returning.length) {
      sql = this._returning(relatable, sql, returning);
    }
    values = keys.parameters.map(function(key) {
      return parameters[key];
    });
    return this.sql(sql, values, function(error, results) {
      if (error) {
        return callback(error);
      } else {
        return callback(null, _this._inserted(results, returning));
      }
    });
  };

  Mutator.prototype.update = function(mutation, operation, callback) {
    var exists, i, k, key, literals, parameters, relatable, set, setOrder, sql, table, v, where, whereOrder, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1,
      _this = this;
    relatable = mutation.relatable;
    table = operation.table, where = operation.where, parameters = operation.parameters, literals = operation.literals;
    table = relatable._toSQL(table);
    exists = {};
    _ref = mutation.schema[table];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      exists[key] = true;
    }
    for (key in operation.parameters) {
      key = relatable._toSQL(key);
      if (!exists[key]) {
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

  return Mutator;

})();
