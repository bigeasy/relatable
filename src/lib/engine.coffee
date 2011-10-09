class exports.Mutator
  insert: (mutation, operation) ->
    relatable = mutation.mutator.relatable
    { table, returning, parameters, literals } = operation

    keys =
      parameters: Object.keys(parameters)
      literals: Object.keys(literals)

    into = keys.parameters.concat(keys.literals).map (key) ->
      relatable._toSQL key

    values = []
    for key, i in keys.parameters
      values.push @_placeholder i
    for key in keys.literals
      values.push literals[key]

    sql = """
      INSERT INTO #{relatable._toSQL table} (#{into.join(", ")})
      VALUES(#{values.join(", ")})
    """

    if returning.length
      sql = @_returning relatable, sql, returning

    values = keys.parameters.map((key) -> parameters[key])
    @sql sql, values, (error, results) =>
      if error
        mutation.callback error
      else
        @_inserted mutation, results, returning
        mutation.mutate()

  update: (mutation, operation) ->
    relatable = mutation.mutator.relatable

    { table, where, parameters, literals } = operation

    table = relatable._toSQL table

    exists = {}
    for key in mutation.schema[table]
      exists[key] = true

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
        mutation.callback error
      else
        @_updated mutation, results
        mutation.mutate()

  delete: (mutation, operation) ->
    relatable = mutation.mutator.relatable

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
        mutation.callback error
      else
        @_deleted mutation, results
        mutation.mutate()
