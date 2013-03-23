var Mutator = require("./engine").Mutator, Client = require("mysql").Client, __slice = [].slice;

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
  this._dual = true;
}

Engine.prototype.connect = function(callback) {
  var engine = this;
  engine._describe(check(callback, function (schema) {
    engine._connect(function(error, connection) {
      callback(error, schema, connection);
    });
  }));
}

Engine.prototype._describe = function (callback) {
  var engine = this, schema, connection, okay = validator(callback);
  if (engine._schema) {
    callback(null, engine._schema);
  } else {
    schema = engine._schema = { public: {} };
    engine._connect(okay(connected));
  }

  function connected ($connection) {
    connection = $connection;
    connection.sql("\
    SELECT columns.table_name, columns.column_name\n\
      FROM information_schema.tables AS tables\n\
      JOIN information_schema.columns AS columns\n\
        USING (table_catalog, table_schema, table_name)\n\
     WHERE table_type = 'BASE TABLE'\n\
       AND tables.table_schema = ?\n\
      ", [ engine._configuration.name ], okay(columns));
  }

  function columns (results) {
    results.forEach(function (column) {
      var table = column.table_name.toLowerCase();
      if (!schema.public[table]) {
        schema.public[table] = { columns: [], key: [] };
      }
      table = schema.public[table];
      table.columns.push(column.column_name);
    });
    connection.sql("\
      SELECT kcu.table_schema, kcu.table_name, kcu.column_name\n\
        FROM information_schema.table_constraints as tc\n\
        JOIN information_schema.key_column_usage AS kcu\n\
          USING (constraint_catalog, constraint_schema, constraint_name,\n\
                 table_name, table_schema)\n\
       WHERE constraint_type = 'PRIMARY KEY'\n\
         AND constraint_schema = ?\n\
      ", [ engine._configuration.name ], okay(keys));
  }

  function keys (results) {
    results.forEach(function (column) {
      schema.public[column.table_name.toLowerCase()].key.push(column.column_name.toLowerCase());
    });
    connection.close("ROLLBACK", okay(close));
  }

  function close () {
    callback(null, schema);
  }
}

Engine.prototype._connect = function(callback) {
  var engine = this, client;
  client = new Client();
  client.host = engine._configuration.hostname;
  client.user = engine._configuration.user;
  client.password = engine._configuration.password;
  client.database = engine._configuration.name;
  return callback(null, new Connection(client));
}

Engine.prototype.temporary = function(structure, parameters) {
  var set, sql;
  set = "SET @position = 0";
  sql = "\
    CREATE TEMPORARY TABLE " + structure.temporary + " AS\n\
    SELECT @position := @position + 1 AS " + structure.temporary + "_row_number,\n\
           " + structure.temporary + "_subselect.*\n\
      FROM (\n    " + structure.sql + "\n  ) AS " + structure.temporary + "_subselect";
  return [[set, []], [sql, parameters]];
};

Connection.name = 'Connection';

function Connection(_client) {
  this._client = _client;
}

require("util").inherits(Connection, Mutator);

Connection.prototype.sql = function(query, parameters, callback) {
  var connection = this;
  try {
    connection._client.query(query, parameters, callback);
  } catch (error) {
    console.error("CLOSING");
    connection.close(null, callback);
  }
};

Connection.prototype.close = function(terminator, callback) {
  var connection = this;
  connection._client.destroy();
  callback();
};

Connection.prototype._returning = function(relatable, sql) {
  return sql;
};

Connection.prototype._placeholder = function(i) {
  return "?";
};

Connection.prototype._inserted = function(results, schema) {
  var result = {};
  if (results.insertId != null) {
    result[schema.key[0]] = results.insertId;
  }
  return result;
}

Connection.prototype._updated = function(results) {
  return {
    count: results.affectedRows
  };
};

Connection.prototype._deleted = function(results) {
  return {
    count: results.affectedRows
  };
};
