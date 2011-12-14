{Client} = require "mysql"
{Mutator} = require "./engine"

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
                JOIN information_schema.columns AS columns USING (table_schema, table_name)
               WHERE table_type = 'BASE TABLE' AND tables.table_schema = ?
            """, [ connection._client.database ], (error, results) =>
              @_schema = {}
              for column in results
                (@_schema[column.TABLE_NAME] or= []).push(column.COLUMN_NAME)
              connection.close("COMMIT", ->)
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
    sql = """
      CREATE TEMPORARY TABLE #{structure.temporary} AS
      SELECT @position := @position + 1 AS #{structure.temporary}_row_number, #{structure.temporary}_subselect.*
        FROM (
          #{structure.sql}
        ) AS #{structure.temporary}_subselect
    """
    [ [ set, [] ], [ sql, parameters ] ]

class Connection extends Mutator
  constructor: (@_client) ->

  sql: (query, parameters, callback) ->
    try
      @_client.query query, parameters, callback
    catch error
      console.error "CLOSING"
      @close()
      callback error

  close: (terminator, callback) ->
    @_client.destroy()
    callback()

  _returning: (relatable, sql, returning) ->
    # FIXME Throws an exception when it should callback.
    if returning.length isnt 1
      throw new Error "can only return one value"
    sql

  _placeholder: (i) -> "?"

  _inserted: (results, returning) ->
    if returning.length is 1
      result = { }
      result[returning[0]] = results.insertId
      result
    else
      { insertId: results.insertId }
    

  _updated: (results) -> { count: results.affectedRows }

  _deleted: (results) -> { count: results.affectedRows }
