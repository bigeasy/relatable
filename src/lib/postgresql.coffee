pg = require "pg"

class exports.Engine
  constructor: (@_configuration) ->

  connect: (callback) ->
    client = new (pg.Client)(@_configuration)
    client.on "connect", =>
      callback(null, new Connection(client))
    client.on "error", (error) =>
      callback(error, null)
    client.connect()

class Connection
  constructor: (@_client) ->

  sql: (query, parameters, get, callback) ->
    if typeof get is "function"
      callback = get
      get = null
    @_client.query query, parameters, (error, results) =>
      if not error
        if get
          expanded = []
          for result in results.rows
            expanded.push @treeify result, get
        else
          expanded = results.rows
        expanded.rowCount = results.rowCount
      callback(error, expanded)

  close: -> @_client.end()

  treeify: (record, get) ->
    tree = {}
    for key, value of record
      parts = key.split /__/
      branch = tree
      for i in [0...parts.length - 1]
        branch = branch[parts[i]] = branch[parts[i]] or {}
      branch[parts[parts.length - 1]] = record[key]
    tree[get]

