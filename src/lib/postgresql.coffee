pg = require "pg"
{Mutator} = require "./engine"

class exports.Engine
  constructor: (@_configuration) ->

  schema: (callback) ->
    if not @_schmea
      @_schema = {}
      @_connect (error, connection) =>
        if error
          callback error
        else
          connection.sql """
            SELECT columns.*
              FROM information_schema.tables AS tables
              JOIN information_schema.columns AS columns USING (table_catalog, table_schema, table_name)
             WHERE table_type = 'BASE TABLE' AND  tables.table_schema NOT IN ('pg_catalog', 'information_schema')
          """, (error, results) =>
            if error
              callback error
            else
              for column in results.rows
                (@_schema[column.table_name] or= []).push(column.column_name)
              connection.close("ROLLBACK", ->)
              callback null, @_schema
    else
      callback null, @_schema

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
    @schema (error, schema) =>
      if error
        callback error
      else
        @_connect (error, connection) =>
          callback(error, schema, connection)

  _connect: (callback) ->
    @_configuration.database = @_configuration.name
    client = new (pg.Client)(@_configuration)
    client.on "connect", =>
      callback(null, new Connection(client))
    client.on "error", (error) =>
      callback(error)
    client.connect()

class Connection extends Mutator
  constructor: (@_client) ->

  sql: (query, parameters, callback) ->
    @_client.query query, parameters, callback

  close: (terminator, callback) ->
    @_client.once "drain", -> callback()
    @_client.query terminator, [], => @_client.end()

  _returning: (relatable, sql, returning) ->
    if returning.length > 1
      throw new Error "can only return one value"
    sql + " RETURNING #{returning.map((k) -> relatable._toSQL k).join(", ")}"

  _placeholder: (i) -> "$#{i + 1}"

  _inserted: (results, returning) ->
    if results.rows.length
      results.rows[0]
    else
      { count: results.rowCount }

  _updated: (results) ->
    { count: results.rowCount }

  _deleted: (results) ->
    { count: results.rowCount }
