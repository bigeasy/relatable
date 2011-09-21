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

  close: -> @_client.end()
