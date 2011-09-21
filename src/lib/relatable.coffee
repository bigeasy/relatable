compiler = require "./compiler"

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
      sql = [ name[i].toLowerCase() ]
      for i in [1...name.length]
        char = name[i]
        lower = char.toLowerCase()
        upper = char.toUpperCase()
        if lower != upper && upper = char
          push.sql "_"
        push.sql lower
      lower.join("")
    else
      name
  
  select: (sql, splat...) ->
    callback = splat.pop()
    @_engine.connect (error, schema, connection) =>
      compiler.compile sql, schema, (structure) =>
        connection.sql structure.sql, splat, (error, results) =>
          throw error if error
          if not error
            if structure.pivot
              expanded = []
              for result in results.rows
                expanded.push @_treeify result, structure.pivot
            else
              expanded = results.rows
          connection.close()
          callback(error, expanded)

  _treeify: (record, get) ->
    tree = {}
    for key, value of record
      parts = key.split /__/
      branch = tree
      for i in [0...parts.length - 1]
        part = @_toJavaScript parts[i]
        branch = branch[part] = branch[part] or {}
      branch[@_toJavaScript parts[parts.length - 1]] = record[key]
    tree[get]
