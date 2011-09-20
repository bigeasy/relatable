class exports.Relatable
  constructor: (configuration) ->
    @_engine = new (require(configuration.engine).Engine)(configuration)
