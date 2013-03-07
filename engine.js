var __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  return process.exit(1);
}

function say () { return console.log.apply(console, __slice.call(arguments, 0)) }

Mutator.name = 'Mutator';

function Mutator() {}

exports.Mutator = Mutator;

Mutator.prototype.raw = function (mutation, operation) {
  var mutator = this, relatable = mutation.mutator.relatable;
  mutator.sql(operation.sql, operation.parameters, function (error, results) {
    if (error) {
      mutation.callback(error);
    } else {
      mutation.results.push(results);
      mutation.mutate();
    }
  });
};

Mutator.prototype.select = function (mutation, operation) {
  var callback, relatable = mutation.mutator.relatable;
  callback = function (error, results) {
    if (error) {
      mutation.callback(error);
    } else {
      mutation.results.push(results);
      mutation.mutate();
    }
  };
  relatable._select(mutation.schema,
                    mutation.connection,
                    operation.sql,
                    operation.parameters,
                    false,
                    callback);
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
      dual = mutation.relatable._engine._dual ? "FROM DUAL\n" : "",
      sql = "\
    INSERT INTO " + (relatable._toSQL(table)) + " (" + (into.join(", ")) + ")\n\
    SELECT " + (values.join(", ")) + "\n\
    " + dual +"\
    WHERE NOT EXISTS (\n\
      SELECT 1\n\
      FROM " + (relatable._toSQL(table)) + "\n\
      WHERE " + where.join(" AND ") + "\n\
    )\n\
    ";
  values = parameters.map(function (key) {
    return operation.parameters[key];
  }).concat(operation.where.map(function (key) {
    return operation.parameters[key];
  }));
  sql = mutator._returning(relatable, sql, schema);
  mutator.sql(sql, values, function (error, results) {
    if (error) callback(error);
    else callback(null, mutator._inserted(results, schema));
  });
}

Mutator.prototype.insert = function (mutation, operation, callback) {
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
  values = parameters.map(function (key) {
    return operation.parameters[key];
  });
  sql = mutator._returning(relatable, sql, schema);
  mutator.sql(sql, values, function (error, results) {
    if (error) callback(error);
    else callback(null, mutator._inserted(results, schema));
  });
};

Mutator.prototype.update = function (mutation, operation, callback) {
  var mutator = this,
      relatable = mutation.relatable,
      table = relatable._toSQL(operation.table),
      where = operation.where,
      parameters = operation.parameters,
      literals ,
      setOrder = Object.keys(operation.parameters),
      set = [],
      whereOrder = Object.keys(operation.where),
      where = [],
      parameters = [],
      exists = {}, sql, key;
  mutation.schema.public[table.toLowerCase()].columns.forEach(function (key) {
    exists[key.toLowerCase()] = true;
  });
  for (key in operation.parameters) {
    key = relatable._toSQL(key);
    if (!exists[key.toLowerCase()]) {
      delete operation.parameters[key];
    }
  }
  setOrder.forEach(function (key, index) {
    set.push("" + relatable._toSQL(key) + " = " + mutator._placeholder(index));
  });
  for (key in operation.literals) {
    set.push("" + relatable._toSQL(key) + " = " + operation.literals[key]);
  }
  whereOrder.forEach(function (k, i) {
    where.push("" + (relatable._toSQL(k)) + " = " + (mutator._placeholder(setOrder.length + i)));
  });
  sql = "\
    UPDATE " + table + "\n\
    SET " + (set.join(", ")) + "\n\
    WHERE " + (where.join(" AND "));
  setOrder.forEach(function (key) {
    parameters.push(operation.parameters[key]);
  });
  whereOrder.forEach(function (key) {
    parameters.push(operation.where[key]);
  });
  mutator.sql(sql, parameters, function (error, results) {
    if (error) callback(error);
    else callback(null, mutator._updated(results));
  });
};

Mutator.prototype["delete"] = function (mutation, operation, callback) {
  var mutator = this,
      relatable = mutation.relatable,
      table = operation.table,
      where = operation.where,
      selected = Object.keys(where),
      conditions = selected.map(function (k, i) {
        return "" + relatable._toSQL(k) + " = " + mutator._placeholder(i);
      }),
      sql = "\
        DELETE FROM " + (relatable._toSQL(table)) + "\n\
        WHERE " + (conditions.join(" AND ")) + "\n\
        ",
      parameters = selected.map(function (key) { return where[key] });
  mutator.sql(sql, parameters, function (error, results) {
    if (error) callback(error);
    else callback(null, mutator._deleted(results));
  });
};
