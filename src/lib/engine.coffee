class exports.Mutator
  insert: (mutation, operation) ->
    relatable = mutation.mutator.relatable
    { table, returning, object } = operation

    keys = Object.keys(object)
    sql = """
      INSERT INTO #{relatable._toSQL table} (
        #{keys.map((k) -> relatable._toSQL k).join(", ")}
      )
      VALUES(#{keys.map((k, i) => "#{@_placeholder i}").join(", ")})
    """

    if returning.length
      sql = @_returning relatable, sql, returning

    parameters = keys.map((k) -> object[k])
    @sql sql, parameters, (error, results) =>
      if error
        mutation.callback error
      else
        @_inserted mutation, results, returning
        mutation.mutate()

  update: (mutation, operation) ->
    relatable = mutation.mutator.relatable

    { table, where, object } = operation

    updated = Object.keys(object)
    selected = Object.keys(where)

    assignments = updated.map((k, i) =>
      "#{relatable._toSQL k} = #{@_placeholder i}")

    conditions = selected.map((k, i) =>
      "#{relatable._toSQL k} = #{@_placeholder updated.length + i}")

    sql = """
      UPDATE #{table}
         SET #{assignments.join(", ")}
       WHERE #{conditions.join(" AND ")}
    """

    parameters = []
    for key in updated
      parameters.push object[key]

    for key in selected
      parameters.push where[key]

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
