pg = require "pg"

SCHEMAS = {}
class exports.Engine
  constructor: (@_configuration) ->

  schema: (callback) ->
    if not @_schmea
      @_schema = {}
      @_connect (error, connection) =>
        connection.sql """
          SELECT columns.*
            FROM information_schema.tables AS tables
            JOIN information_schema.columns AS columns USING (table_catalog, table_schema, table_name)
           WHERE table_type = 'BASE TABLE' AND  tables.table_schema NOT IN ('pg_catalog', 'information_schema')
        """, (error, results) =>
          for column in results.rows
            (@_schema[column.table_name] or= []).push(column.column_name)
          connection.close()
          callback @_schema
    else
      callback @_schema

  temporary: (structure, parameters) ->
    create = """
      CREATE TEMPORARY SEQUENCE #{structure.temporary}_seq
    """
    sql = structure.sql.replace /^\s*SELECT/, """
      CREATE TEMPORARY TABLE #{structure.temporary} AS
      SELECT NEXTVAL('#{structure.temporary}_seq') AS #{structure.temporary}_row_number,   
    """
    drop = """
      DROP SEQUENCE #{structure.temporary}_seq
    """
    [ [ create, [] ], [ sql, parameters ], [ drop, [] ] ]

  connect: (callback) ->
    @schema (schema) =>
      @_connect (error, connection) =>
        callback(null, schema, connection)

  _connect: (callback) ->
    client = new (pg.Client)(@_configuration)
    client.on "connect", =>
      callback(null, new Connection(client))
    client.on "error", (error) =>
      callback(error)
    client.connect()

  reflector: ->
    (table, callback) =>

class Connection
  constructor: (@_client) ->

  sql: (query, parameters, callback) ->
    @_client.query query, parameters, callback

  insert: (mutation, operation) ->
    relatable = mutation.mutator.relatable
    { table, returning, object } = operation

    keys = Object.keys(object)
    sql = """
      INSERT INTO #{relatable._toSQL table} (
        #{keys.map((k) -> relatable._toSQL k).join(", ")}
      )
      VALUES(#{keys.map((k, i) -> "$#{i + 1}").join(", ")})
    """

    if returning.length
      sql += " RETURNING #{returning.map((k) -> relatable._toSQL k).join(", ")}"

    parameters = keys.map((k) -> object[k])
    @sql sql, parameters, (error, results) ->
      if error
        mutation.callback error
      else
        mutation.results.push results.rows[0]
        mutation.mutate()

  update: (mutation, operation) ->
    relatable = mutation.mutator.relatable

    { table, where, object } = operation

    updated = Object.keys(object)
    selected = Object.keys(where)

    offset = 1
    assignments = updated.map((k, i) -> "#{relatable._toSQL k} = $#{i + offset}")

    offset += updated.length
    conditions = selected.map((k, i) -> "#{relatable._toSQL k} = $#{i + offset}")

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

    @sql sql, parameters, (error, results) ->
      if error
        mutation.callback error
      else
        mutation.results.push { count: results.rowCount }
        mutation.mutate()

  delete: (mutation, operation) ->
    relatable = mutation.mutator.relatable

    { table, where } = operation

    selected = Object.keys(where)
    conditions = selected.map((k, i) -> "#{relatable._toSQL k} = $#{i + 1}")

    sql = """
      DELETE FROM #{relatable._toSQL table}
            WHERE #{conditions.join(" AND ")}
    """

    parameters = []
    for key in selected
      parameters.push where[key]

    @sql sql, parameters, (error, results) ->
      if error
        mutation.callback error
      else
        mutation.results.push { count: results.rowCount }
        mutation.mutate()

  close: -> @_client.end()
