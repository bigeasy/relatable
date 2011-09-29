{Client} = require "mysql"

class exports.Engine
  constructor: (@_configuration) ->

  connect: (callback) ->
    if not @_schema
      @_connect (error, connection) =>
        if error
          callback error
        else
          connection.sql """
              SELECT columns.*
                FROM information_schema.tables AS tables
                JOIN information_schema.columns AS columns USING (table_catalog, table_schema, table_name)
               WHERE table_type = 'BASE TABLE' AND tables.table_schema NOT IN ('pg_catalog', 'information_schema')
            """, (error, results) =>
              @_schema = {}
              for column in results
                (@_schema[column.TABLE_NAME] or= []).push(column.COLUMN_NAME)
              connection.close()
              @connect callback
    else
      @_connect (error, connection) =>
        callback(error, @_schema, connection)

  _connect: (callback) ->
    client            = new Client()
    client.host       = @_configuration.hostname
    client.user       = @_configuration.user
    client.password   = @_configuration.password
    client.database   = @_configuration.name
    client.connect (error) ->
      if error
        callback error
      else
        callback null, new Connection(client)

  temporary: (structure, parameters) ->
    set = """
      SET @position = 0
    """
    sql = structure.sql.replace /^\s*SELECT/, """
      CREATE TEMPORARY TABLE #{structure.temporary} AS
      SELECT @position := @position + 1 AS #{structure.temporary}_row_number,   
    """
    [ [ set, [] ], [ sql, parameters ] ]

class Connection
  constructor: (@_client) ->

  sql: (query, parameters, callback) ->
    @_client.query query, parameters, callback

  close: -> @_client.destroy()
