var pg = require("pg"),
    Mutator = require("./engine").Mutator,
    __slice = [].slice,
    cadence = require("cadence");

pg.defaults.parseFloat = false;
pg.defaults.hideDeprecationWarnings = true;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  process.exit(1);
}

function say () { console.log.apply(console, __slice.call(arguments, 0)) }

exports.Engine = Engine;

Engine.name = 'Engine';

function Engine(_configuration) {
  this._configuration = _configuration;
}

Engine.prototype.schema = cadence(function(step) {
  var schema, connection;
  if (this._schema) return this._schema;
  else step(function () {
    schema = this._schema = {};
    this._connect(step());
  }, function (connection) {
    step(function () {
      connection.sql("\
      SELECT columns.*\n\
        FROM information_schema.tables AS tables\n\
        JOIN information_schema.columns AS columns\n\
          USING (table_catalog, table_schema, table_name)\n\
       WHERE table_type = 'BASE TABLE'\n\
         AND tables.table_schema NOT IN ('pg_catalog', 'information_schema')\n\
        ", step());

    }, function (results) {

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
        ", step());

    }, function (results) {

      results.rows.forEach(function (column) {
        schema[column.table_schema][column.table_name].key.push(column.column_name);
      });
      connection.close("ROLLBACK", step());

    }, function () {
      return schema;
    });
  });
});

Engine.prototype.temporary = function(structure, parameters) {
  var create, drop, sql;
  create = "CREATE TEMPORARY SEQUENCE " + structure.temporary + "_seq";
  sql = structure.sql.replace(/^\s*SELECT/, "\
    CREATE TEMPORARY TABLE " + structure.temporary + " AS\n\
    SELECT NEXTVAL('" + structure.temporary + "_seq') AS " + structure.temporary + "_row_number,\n\
    ");
  drop = "DROP SEQUENCE " + structure.temporary + "_seq";
  return [[create, []], [sql, parameters], [drop, []]];
};

Engine.prototype.connect = cadence(function (step) {
  step(function () {
    this.schema(step());
    this._connect(step());
  }, function (schema, connection) {
    step(null, schema, connection);
  });
});

Engine.prototype._connect = function(callback) {
  var client,
    _this = this;
  this._configuration.database = this._configuration.name;
  client = new pg.Client(this._configuration);
  client.on("connect", function() {
    callback(null, new Connection(client));
  });
  client.on("error", function(error) {
    callback(error);
  });
  client.connect();
};

Connection.name = 'Connection';

function Connection(_client) {
  this._client = _client;
}

require("util").inherits(Connection, Mutator);

Connection.prototype.sql = function(query, parameters, callback) {
  return this._client.query(query, parameters, callback);
};

Connection.prototype.close = cadence(function(step, terminator) {
  step(function () {
    this._client.query(terminator, [], step());
  }, function () {
    this._client.end();
  });
});

Connection.prototype.mutate = function (callback) {
  this.sql('BEGIN TRANSACTION', callback);
}

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
