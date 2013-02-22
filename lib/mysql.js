var Client, Connection, Mutator,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Client = require("mysql").Client;

Mutator = require("./engine").Mutator;

exports.Engine = (function() {

  Engine.name = 'Engine';

  function Engine(_configuration) {
    this._configuration = _configuration;
  }

  Engine.prototype.connect = function(callback) {
    var _this = this;
    if (!this._schema) {
      return this._connect(function(error, connection) {
        if (error) {
          return callback(error);
        } else {
          return connection.sql("SELECT columns.*\n  FROM information_schema.tables AS tables\n  JOIN information_schema.columns AS columns USING (table_schema, table_name)\n WHERE table_type = 'BASE TABLE' AND tables.table_schema = ?", [connection._client.database], function(error, results) {
            var column, _base, _i, _len, _name;
            _this._schema = {};
            for (_i = 0, _len = results.length; _i < _len; _i++) {
              column = results[_i];
              ((_base = _this._schema)[_name = column.TABLE_NAME] || (_base[_name] = [])).push(column.COLUMN_NAME);
            }
            connection.close("COMMIT", function() {});
            return _this.connect(callback);
          });
        }
      });
    } else {
      return this._connect(function(error, connection) {
        return callback(error, _this._schema, connection);
      });
    }
  };

  Engine.prototype._connect = function(callback) {
    var client;
    client = new Client();
    client.host = this._configuration.hostname;
    client.user = this._configuration.user;
    client.password = this._configuration.password;
    client.database = this._configuration.name;
    return callback(null, new Connection(client));
  };

  Engine.prototype.temporary = function(structure, parameters) {
    var set, sql;
    set = "SET @position = 0";
    sql = "CREATE TEMPORARY TABLE " + structure.temporary + " AS\nSELECT @position := @position + 1 AS " + structure.temporary + "_row_number, " + structure.temporary + "_subselect.*\n  FROM (\n    " + structure.sql + "\n  ) AS " + structure.temporary + "_subselect";
    return [[set, []], [sql, parameters]];
  };

  return Engine;

})();

Connection = (function(_super) {

  __extends(Connection, _super);

  Connection.name = 'Connection';

  function Connection(_client) {
    this._client = _client;
  }

  Connection.prototype.sql = function(query, parameters, callback) {
    try {
      return this._client.query(query, parameters, callback);
    } catch (error) {
      console.error("CLOSING");
      return this.close(null, function() {
        return callback(error);
      });
    }
  };

  Connection.prototype.close = function(terminator, callback) {
    this._client.destroy();
    return callback();
  };

  Connection.prototype._returning = function(relatable, sql, returning) {
    if (returning.length !== 1) {
      throw new Error("can only return one value");
    }
    return sql;
  };

  Connection.prototype._placeholder = function(i) {
    return "?";
  };

  Connection.prototype._inserted = function(results, returning) {
    var result;
    if (returning.length === 1) {
      result = {};
      result[returning[0]] = results.insertId;
      return result;
    } else {
      return {
        insertId: results.insertId
      };
    }
  };

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

  return Connection;

})(Mutator);
