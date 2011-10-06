compiler = require "./compiler"

class Selection
  constructor: (@relatable, @schema, @connection, @sql, @parameters, @callback) ->
    @cleanup = []
    @completed = {}

  execute: ->
    compiler.compile @sql, @schema, (structure) =>
      if Array.isArray @parameters
        parameters = {}
        parameters[structure.pivot] = @parameters
        @parameters = parameters
      @select [ structure ]

  complete: ->
    if @cleanup.length
      @connection.sql @cleanup.shift(), [], (error, results) =>
        if error
          @callback error
        else
          @complete()
    else
      @connection.close()
      @callback null, @results
  
  join: (structures, expanded) ->
    structure = structures.shift()
    @completed[structure.pivot] = expanded
    for join in structure.joins
      structures.push join
    if structures.length
      @select structures
    else
      @complete()

  _get: (record, key) ->
    path = key.split /\./
    while path.length > 1
      record = record?[path.shift()]
    record?[path.shift()]
    
  gather: (sql, structures, parameters) ->
    @connection.sql sql, parameters, (error, results) =>
      if error
        @callback error
      else
        if pivot = structures[0].pivot
          expanded = []
          joins = structures[0].joins or []
          for result in results.rows or results
            tree = @treeify result, pivot
            for join in joins
              tree[join.pivot] = []
            expanded.push tree
        else
          expanded = results.rows or results
        if pivot and structures[0].join
          join = structures[0].join
          fields = join.fields
          map = {}
          keys = Object.keys fields
          for record in @completed[join.table]
            current = map
            for i in [0...keys.length - 1]
              current = current[record[keys[i]]] or= {}
            current[record[@relatable._toJavaScript keys[keys.length - 1]]] = record
          for record in expanded
            current = map
            for i in [0...keys.length - 1]
              current = current[record[fields[keys[i]]]] or= {}
            parent = current[@_get(record, @relatable._toJavaScript fields[keys[keys.length - 1]])]
            parent[pivot].push(record)
        else
          @results = expanded
        @join structures, expanded

  temporary: (structures, prepare) ->
    if prepare.length
      @connection.sql.apply @connection, prepare.shift().concat (error, results) =>
        if error
          @callback error
        else
          @temporary structures, prepare
    else
      sql = """
        SELECT *
          FROM #{structures[0].temporary}
         ORDER
            BY #{structures[0].temporary}_row_number
      """
      @gather sql, structures, []

  select: (structures) ->
    parameters = @parameters[structures[0].pivot] or []
    if structures[0].joins.length
      prepare = @relatable._engine.temporary structures[0], parameters
      @cleanup.push """
        DROP TABLE #{structures[0].temporary}
      """
      @temporary structures, prepare
    else
      @gather structures[0].sql, structures, parameters

  treeify: (record, get) ->
    tree = {}
    for key, value of record
      parts = key.split /__/
      branch = tree
      for i in [0...parts.length - 1]
        part = @relatable._toJavaScript parts[i]
        branch = branch[part] = branch[part] or {}
      branch[@relatable._toJavaScript parts[parts.length - 1]] = record[key]
    tree[get]

class Mutation
  constructor: (@mutator, @schema, @connection, @operations, @callback) ->
    @results = []

  mutate: ->
    if @operations.length
      operation = @operations.shift()
      @connection[operation.type](@, operation)
    else
      @connection.close()
      @callback null, @results

class Mutator
  constructor: (@relatable) ->
    @operations = []

  _subset: (object, keys) ->
    subset = {}
    for key in keys
      subset[key] = object[key]
    subset

  _fixupObject: (object) ->
    hasParameters = typeof object.parameters is "object"
    hasLiterals  = typeof object.literals is "object"
    if not (hasParameters or hasLiterals)
      object = parameters: object
      hasParameters = true
    object.parameters = {} if not hasParameters
    object.literals = {} if not hasLiterals
    object

  insert: (table, returning..., object) ->
    object = @_fixupObject object
    @operations.push { type: "insert", table, returning, object }

  update: (table, where..., object) ->
    if where.length is 1 and typeof where[0] is "object"
      where = where[0]
    else
      where = @_subset object, where
      set = Object.keys(object).filter((key) -> where[key] is undefined)
      object = @_subset object, set
    @operations.push { type: "update", table, where, object }

  delete: (table, where..., object) ->
    if where.length is 0
      where = object
    else
      where = @_subset object, where
    @operations.push { type: "delete", table, where }

  execute: (callback) ->
    @relatable._engine.connect (error, schema, connection) =>
      if error
        callback error
      else
        mutation = new Mutation(@, schema, connection, @operations, callback)
        mutation.mutate()

class exports.Relatable
  constructor: (configuration) ->
    @_engine    = new (require(configuration.engine).Engine)(configuration)
    @_fixup     = configuration.fixup
    @_acronyms  = configuration.acronyms

  _toJavaScript: (column, capitalize) ->
    start = if capitalize then 0 else 1
    if @_fixup
      fixed = []
      parts = column.split /_/
      for i in [0...start]
        fixed.push parts[i]
      for i in [start...parts.length]
        fixed.push parts[i].substring(0, 1).toUpperCase()
        fixed.push parts[i].substring(1)
      fixed.join("")
    else
      column

  _toSQL: (field) ->
    if @_fixup
      sql = [ field[0].toLowerCase() ]
      for i in [1...field.length]
        char = field[i]
        lower = char.toLowerCase()
        upper = char.toUpperCase()
        if lower isnt upper and upper is char
          sql.push "_"
        sql.push lower
      sql.join("")
    else
      field

  select: (sql, parameters...) ->
    callback = parameters.pop()
    if parameters.length is 1 and typeof parameters[0] is "object"
      parameters = parameters[0]
    @_engine.connect (error, schema, connection) =>
      if error
        callback error
      else
        selection = new Selection(@, schema, connection, sql, parameters, callback)
        selection.execute()

  mutate: -> new Mutator(@)

  sql: (sql, parameters..., callback) ->
    if parameters.length and Array.isArray(parameters[0])
      parameters = parameters[0]
    @_engine.connect (error, schema, connection) =>
      if error
        callback error
      else
        connection.sql sql, parameters, (error, results) =>
          if error
            callback error
          else
            connection.close()
            callback null, results

  cache: (engine) ->
    new CachingRelatable(@, engine || new ForeverCache())

  uncached: -> @

  encache: ->

  fetch: (key, callback) -> callback false

class ForeverCache
  constructor: -> @_map = {}
  get: (key) -> @_map[key]
  put: (key, value) -> @_map[key] = value

class exports.Cache
  constructor: (timeout) ->
    @timeout = (timeout or 10)
    @_map = {}
    @_expires = {}

  get: (key) ->
    expires = @_expires[key]
    if expires? and expires >= (new Date().getTime())
      @_map[key]
    else
      null

  put: (key, value) ->
    @_expires[key] = (new Date().getTime() + @timeout * 1000)
    @_map[key] = value

class CachingRelatable
  constructor: (@_relatable, @cache) ->

  mutate: -> @_relatable.mutate()

  sql: -> @_relatable.sql()

  select: (sql, parameters..., callback) ->
    query = [ sql ].concat(parameters)
    key = []
    for parameter in query
      key.push encodeURIComponent parameter
    key = key.join("&")
    results = @cache.get(key)
    if results
      callback null, results
    else
      @_relatable.select.apply @_relatable, query.concat (error, results) =>
        if error
          callback error
        else
          @encache(key, results)
          callback null, results

  fetch: (key, callback) ->
    value = @cache.get(key)
    if not value
      @_relatable.fetch(key, callback)
    else
      callback(true, value)

  encache: (key, results) ->
    @cache.put(key, results)
    @_relatable.encache(key, results)

  uncached: -> @_relatable.uncached()
