var Mutator = require("./engine").Mutator,
    Client = require("mysql").Client,
    __slice = [].slice,
    cadence = require("cadence");

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  process.exit(1);
}

function say () { console.log.apply(console, __slice.call(arguments, 0)) }

exports.Engine = Engine;

Engine.name = 'Engine';

function Engine(_configuration) {
  this._configuration = _configuration;
  this._dual = true;
}

Engine.prototype.connect = cadence(function(step) {
  step(function () {
    this._describe(step());
  }, function (schema) {
    step(null, schema, this._connect());
  });
});

Engine.prototype._describe = cadence(function (step) {
  if (this._schema) step(null, this._schema);
  else {
    var schema = (this._schema = { public: {} });
    var connection = this._connect();
    step(function () {
      connection.sql("\
      SELECT columns.table_name, columns.column_name\n\
        FROM information_schema.tables AS tables\n\
        JOIN information_schema.columns AS columns\n\
          USING (table_catalog, table_schema, table_name)\n\
       WHERE table_type = 'BASE TABLE'\n\
         AND tables.table_schema = ?\n\
        ", [ this._configuration.name ], step());
    }, function (results) {
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
        ", [ this._configuration.name ], step());
    }, function (results) {
      results.forEach(function (column) {
        schema.public[column.table_name.toLowerCase()].key.push(column.column_name.toLowerCase());
      });
      connection.close("ROLLBACK", step());
    }, function () {
      return schema;
    });
  }
});

Engine.prototype._connect = function() {
  var engine = this, client;
  client = new Client();
  client.host = engine._configuration.hostname;
  client.user = engine._configuration.user;
  client.password = engine._configuration.password;
  client.database = engine._configuration.name;
  return new Connection(client);
}

Engine.prototype.temporary = function(structure, parameters) {
  var set, sql;
  set = "SET @position = 0";
  sql = "\
    CREATE TEMPORARY TABLE " + structure.temporary + " AS\n\
    SELECT @position := @position + 1 AS " + structure.temporary + "_row_number,\n\
           " + structure.temporary + "_subselect.*\n\
      FROM (\n    " + structure.sql + "\n  ) AS " + structure.temporary + "_subselect";
  eturn [[set, []], [sql, parameters]];
};

Connection.name = 'Connection';

function Connection(_client) {
  this._client = _client;
}

require("util").inherits(Connection, Mutator);

Connection.prototype.sql = function(sql, parameters, callback) {
  try {
    this._client.query(sql, parameters, callback);
  } catch (error) {
    callback(error);
  }
};

Connection.prototype.close = cadence(function(step, terminator) {
  step(function () {
    this._client.query(terminator, step());
  }, function () {
    this._client.end(step());
  });
});

Connection.prototype.mutate = function (callback) {
  this._client.query("BEGIN", callback);
}

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
