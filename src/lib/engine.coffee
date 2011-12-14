class exports.Mutator
  raw: (mutation, operation) ->
    relatable = mutation.mutator.relatable
    @sql operation.sql, operation.parameters, (error, results) ->
      if error
        mutation.callback error
      else
        mutation.results.push results
        mutation.mutate()

  select: (mutation, operation) ->
    relatable = mutation.mutator.relatable
    callback = (error, results) ->
      if error
        mutation.callback error
      else
        mutation.results.push results
        mutation.mutate()
    relatable._select(mutation.schema, mutation.connection, operation.sql, operation.parameters, false, callback)

  insert: (mutation, operation, callback) ->
    relatable = mutation.relatable
    { table, returning, parameters, literals } = operation

    keys =
      parameters: Object.keys(parameters)
      literals: Object.keys(literals)

    into = keys.parameters.concat(keys.literals).map (key) ->
      relatable._toSQL key

    values = []
    values.push @_placeholder i for key, i in keys.parameters
    values.push literals[key] for key in keys.literals

    sql = """
      INSERT INTO #{relatable._toSQL table} (#{into.join(", ")})
      VALUES(#{values.join(", ")})
    """

    if returning.length
      sql = @_returning relatable, sql, returning

    values = keys.parameters.map((key) -> parameters[key])
    @sql sql, values, (error, results) =>
      if error
        callback error
      else
        callback null, @_inserted results, returning

  update: (mutation, operation, callback) ->
    relatable = mutation.relatable

    { table, where, parameters, literals } = operation

    table = relatable._toSQL table

    exists = {}
    exists[key] = true for key in mutation.schema[table]

    for key of operation.parameters
      key = relatable._toSQL key
      if not exists[key]
        delete operation.parameters[key]

    setOrder = Object.keys(operation.parameters)
    set = []
    for k, i in setOrder
      set.push "#{relatable._toSQL k} = #{@_placeholder i}"

    for k, v of operation.literals
      set.push "#{relatable._toSQL k} = #{v}"

    whereOrder = Object.keys(operation.where)
    where = []
    for k, i in whereOrder
      where.push "#{relatable._toSQL k} = #{@_placeholder setOrder.length + i}"

    sql = """
      UPDATE #{table}
         SET #{set.join(", ")}
       WHERE #{where.join(" AND ")}
    """

    parameters = []
    for key in setOrder
      parameters.push operation.parameters[key]

    for key in whereOrder
      parameters.push operation.where[key]

    @sql sql, parameters, (error, results) =>
      if error
        callback error
      else
        callback null, @_updated results

  delete: (mutation, operation, callback) ->
    relatable = mutation.relatable

    { table, where } = operation

    selected = Object.keys(where)
    conditions = selected.map((k, i) => "#{relatable._toSQL k} = #{@_placeholder i}")

    sql = """
      DELETE FROM #{relatable._toSQL table}
            WHERE #{conditions.join(" AND ")}
    """

    parameters = []
    for key in selected
      parameters.push where[key]

    @sql sql, parameters, (error, results) =>
      if error
        callback error
      else
        callback null, @_deleted results
