compiler = require "./compiler"

class exports.Relatable
  constructor: (configuration) ->
    @_engine = new (require(configuration.engine).Engine)(configuration)

  select: (sql, callback) ->
    @_engine.connect (error, connection) ->
      callback()
