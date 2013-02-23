var Connection, Mutator, pg,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

pg = require("pg");

Mutator = require("./engine").Mutator;

exports.Engine = Engine;

Engine.name = 'Engine';

function Engine(_configuration) {
  this._configuration = _configuration;
}

Engine.prototype.schema = function(callback) {
  var _this = this;
  if (!this._schmea) {
    this._schema = {};
    return this._connect(function(error, connection) {
      if (error) {
        return callback(error);
      } else {
        return connection.sql("SELECT columns.*\n  FROM information_schema.tables AS tables\n  JOIN information_schema.columns AS columns USING (table_catalog, table_schema, table_name)\n WHERE table_type = 'BASE TABLE' AND  tables.table_schema NOT IN ('pg_catalog', 'information_schema')", function(error, results) {
          var column, _base, _i, _len, _name, _ref;
          if (error) {
            return callback(error);
          } else {
            _ref = results.rows;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              column = _ref[_i];
              ((_base = _this._schema)[_name = column.table_name] || (_base[_name] = [])).push(column.column_name);
            }
            connection.close("ROLLBACK", function() {});
            return callback(null, _this._schema);
          }
        });
      }
    });
  } else {
    return callback(null, this._schema);
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
  var _this = this;
  return this.schema(function(error, schema) {
    if (error) {
      return callback(error);
    } else {
      return _this._connect(function(error, connection) {
        return callback(error, schema, connection);
      });
    }
  });
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

Connection.prototype._returning = function(relatable, sql, returning) {
  if (returning.length > 1) {
    throw new Error("can only return one value");
  }
  return sql + (" RETURNING " + (returning.map(function(k) {
    return relatable._toSQL(k);
  }).join(", ")));
};

Connection.prototype._placeholder = function(i) {
  return "$" + (i + 1);
};

Connection.prototype._inserted = function(results, returning) {
  if (results.rows.length) {
    return results.rows[0];
  } else {
    return {
      count: results.rowCount
    };
  }
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
