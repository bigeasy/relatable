var pg = require("pg"), Mutator = require("./engine").Mutator, __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  return process.exit(1);
}

function say () { return console.log.apply(console, __slice.call(arguments, 0)) }

function validator (callback) {
  return function (forward) { return check(callback, forward) }
}

function check (callback, forward) {
  return function (error) {
    if (error) {
      callback(error);
    } else {
      try {
        forward.apply(null, __slice.call(arguments, 1));
      } catch (error) {
        callback(error);
      }
    }
  }
}

exports.Engine = Engine;

Engine.name = 'Engine';

function Engine(_configuration) {
  this._configuration = _configuration;
}

Engine.prototype.schema = function(callback) {
  var engine = this, schema, connection, okay = validator(callback);
  if (engine._schmea) {
    callback(null, engine._schema);
  } else {
    schema = engine._schema = {};
    engine._connect(okay(connected));
  }

  function connected ($connection) {
    connection = $connection;
    connection.sql("\
    SELECT columns.*\n\
      FROM information_schema.tables AS tables\n\
      JOIN information_schema.columns AS columns\n\
        USING (table_catalog, table_schema, table_name)\n\
     WHERE table_type = 'BASE TABLE'\n\
       AND tables.table_schema NOT IN ('pg_catalog', 'information_schema')\n\
      ", okay(columns));
  }

  function columns (results) {
    results.rows.forEach(function (column) {
      if (!schema[column.table_schema]) {
        schema[column.table_schema] = {};
      }
      if (!schema[column.table_schema][column.table_name]) {
        schema[column.table_schema][column.table_name] = { columns: [], key: [] };
      }
      var table = schema[column.table_schema][column.table_name];
      table.columns.push(column.column_name);
    });
    connection.sql("\
      SELECT kcu.table_schema, kcu.table_name, kcu.column_name\n\
        FROM information_schema.table_constraints as tc\n\
        JOIN information_schema.key_column_usage AS kcu\n\
          USING (constraint_catalog, constraint_schema, constraint_name,\n\
                 table_name, table_schema, table_catalog)\n\
       WHERE constraint_type = 'PRIMARY KEY'\n\
      ", okay(keys)); 
  }

  function keys (results) {
    results.rows.forEach(function (column) {
      schema[column.table_schema][column.table_name].key.push(column.column_name);
    });
    connection.close("ROLLBACK", okay(close));
  }

  function close () {
    callback(null, schema);
  }
};

Engine.prototype.temporary = function(structure, parameters) {
  var create, drop, sql;
  create = "CREATE TEMPORARY SEQUENCE " + structure.temporary + "_seq";
  sql = structure.sql.replace(/^\s*SELECT/, "CREATE TEMPORARY TABLE " + structure.temporary + " AS\nSELECT NEXTVAL('" + structure.temporary + "_seq') AS " + structure.temporary + "_row_number,   ");
  drop = "DROP SEQUENCE " + structure.temporary + "_seq";
  return [[create, []], [sql, parameters], [drop, []]];
};

Engine.prototype.connect = function(callback) {
  var engine = this;
  engine.schema(check(callback, function (schema) {
    engine._connect(function(error, connection) {
      callback(error, schema, connection);
    });
  }));
};

Engine.prototype._connect = function(callback) {
  var client,
    _this = this;
  this._configuration.database = this._configuration.name;
  client = new pg.Client(this._configuration);
  client.on("connect", function() {
    return callback(null, new Connection(client));
  });
  client.on("error", function(error) {
    return callback(error);
  });
  return client.connect();
};

Connection.name = 'Connection';

function Connection(_client) {
  this._client = _client;
}

require("util").inherits(Connection, Mutator);

Connection.prototype.sql = function(query, parameters, callback) {
  return this._client.query(query, parameters, callback);
};

Connection.prototype.close = function(terminator, callback) {
  var _this = this;
  this._client.once("drain", function() {
    return callback();
  });
  return this._client.query(terminator, [], function() {
    return _this._client.end();
  });
};

Connection.prototype._returning = function(relatable, sql, schema) {
  return sql + ("RETURNING " + (schema.key.map(function(k) {
    return relatable._toSQL(k);
  }).join(", ")));
};

Connection.prototype._placeholder = function(i) {
  return "$" + (i + 1);
};

Connection.prototype._inserted = function(results, schema) {
  if (results.rows.length) return results.rows[0];
};

Connection.prototype._updated = function(results) {
  return {
    count: results.rowCount
  };
};

Connection.prototype._deleted = function(results) {
  return {
    count: results.rowCount
  };
};
