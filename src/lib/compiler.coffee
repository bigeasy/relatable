scanner = require "./scanner"
{extend} = require("coffee-script").helpers

identifier = 0

exports.compile = (sql, schema, callback) ->
  scan = scanner.scan sql

  # Split the scan into separate select statements.
  selects = [ [] ]
  for part in scan
    selects[0].push part
    selects.unshift [] if part.type is "rest"
  compileSelect [], selects.pop(), schema, (structure) ->
    compileSelects [ structure ], selects, schema, callback

compileSelects = (path, selects, schema, callback) ->
  if selects.length is 1
    callback(path[0])
  else
    compileSelect path, selects.pop(), schema, (structure, scan) ->
      compileSelects path, selects, schema, callback

compileSelect = (path, scan, schema, callback) ->
  all = false
  expansions = []
  tables = []
  parents = {}
  for token, i in scan
    switch token.type
      when "all"
        expansions.push token
      when "table"
        tables.push table =
          token: token
          columns: []
        if not pivot
          pivot = token.alias
        else
          [ left, right ] = scan.slice(i + 1, i + 3)
          if left.table is token.alias
            parents[left.table] = right.table
          else
            parents[right.table] = left.table
  for expansion in expansions
    if expansion.type is "all"
      expansion.expansions = []
      for table in tables
        expansion.expansions.push [ table.token.name, table.token.alias ]
  seen = {}
  selected = []
  structure = { temporary: "relatable_temporary_#{++identifier}" }
  reflect = ->
    if expansions[0].expansions.length
      [ table, alias ] = expansions[0].expansions.shift()
      for column in schema[table]
        qualifiedName = "#{alias}.#{column}"
        if not seen[qualifiedName]
          current = alias
          prefix = []
          while current?
            prefix.push current
            current = parents[current]
          prefix.reverse()
          prefix.push column
          selected.push "#{qualifiedName} AS #{prefix.join("__")}"
      reflect()
    else if expansions.length isnt 1
      expansions.shift()
      reflect()
    else
      sql = []
      select = scan.shift()
      sql.push select.before
      sql.push selected.join(", ")
      first = true
      structure.join = null
      for token, i in scan
        switch token.type
          when "table"
            if path.length and first
              [ join, pivot ] =
                if scan[i + 1].table is token.alias
                  [ scan[i + 2], scan[i + 1] ]
                else
                  [ scan[i + 1], scan[i + 2] ]
              for i in [path.length - 1..0]
                if path[i].pivot is join.table
                  path[i].joins.push structure
                  structure.join =
                    table: path[i].pivot
                    fields: {}
                  structure.join.fields[join.column] = pivot.column
                  sql.push " FROM #{path[i].temporary} AS #{path[i].pivot}"
                  token.before = token.before.replace /^\s*FROM/i, " JOIN"
                  break
              pivot = pivot.table
              join.value = "#{join.table}.#{join.table}__#{join.column}"
            sql.push token.before
            sql.push token.value or ""
            first = false
          when "left", "right", "rest"
            sql.push token.before
            sql.push token.value or ""
      extend(structure, { sql: sql.join(""), parents, pivot, joins: [] })
      callback(structure, scan)
  reflect()
