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

  gather: (sql, structures, parameters) ->
    @connection.sql sql, parameters, (error, results) =>
      if error
        @callback error
      else
        if pivot = structures[0].pivot
          expanded = []
          for result in results.rows
            expanded.push @treeify result, pivot
        else
          expanded = results.rows
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
            parent = current[record[@relatable._toJavaScript fields[keys[keys.length - 1]]]]
            (parent[pivot] or= []).push(record)
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

  insert: (table, returning..., object) ->
    @operations.push { type: "insert", table, returning, object }

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
