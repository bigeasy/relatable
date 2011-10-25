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
  [ all, expansions, tables, parents, selected ] = [ false, [], [], {}, {} ]

  # In this loop we gather the field names that reference tables in our joins,
  # as well as determine the treeified structure pivot point and the lineage of
  # the joined tables.
  for token, i in scan
    switch token.type
      when "all"
        all = true
        expansions.push token
      when "tableAll"
        selected[token.table] = true
        expansions.push token
      when "table"
        tables.push table =
          token: token
          columns: []
        if all or selected[token.alias]
          if not pivot
            pivot = token.alias
          else
            [ left, right ] = scan.slice(i + 1, i + 3)
            if left.table is token.alias
              parents[left.table] = right.table
            else
              parents[right.table] = left.table
        else if not through
          if scan[i + 1].type is "left"
            [ left, right ] = scan.slice(i + 1, i + 3)
            if left.table is token.alias
              through = left
            else
              through = right
          else
            through = token

  # Table field wildcards will be expanded to reflect the tree structure of the
  # treeified structure.
  for expansion in expansions
    expansion.expansions = []
    if expansion.type is "all"
      for table in tables
        expansion.expansions.push [ table.token.name, table.token.alias ]
    else
      for table in tables
        if table.token.alias is expansion.table
          expansion.expansions.push [ table.token.name, table.token.alias ]
          break
  
  [ seen, selected, columns ] = [ {}, [], [] ]
  structure = { temporary: "relatable_temporary_#{++identifier}" }
  while expansions.length
    if expansions[0].expansions.length
      [ table, alias ] = expansions[0].expansions.shift()
      for column in schema[table]
        qualifiedName = "#{alias}.#{column}"
        if not seen[qualifiedName]
          columns.push { qualifiedName, alias, column }
    else
      expansions.shift()

  if through
    if through.type is "table"
      parents[through.alias] = pivot
    else
      parents[through.table] = pivot
      columns.push
        qualifiedName: "#{through.table}.#{through.column}"
        alias: through.table
        column: through.column

  for select in columns
    current = select.alias
    prefix = []
    while current?
      prefix.push current
      current = parents[current]
    prefix.reverse()
    prefix.push select.column
    selected.push "#{select.qualifiedName} AS #{prefix.join("__")}"
    
  sql = []
  from = select = scan.shift()
  sql.push select.before
  sql.push selected.join(", ")
  first = true
  structure.join = null

  from = scan.shift() while from.type isnt "from"
  token = scan.shift()

  if path.length
    [ join, first ] =
      if scan[0].table is token.alias
        [ scan[1], scan[0] ]
      else
        [ scan[0], scan[1] ]
    for i in [path.length - 1..0]
      if path[i].pivot is join.table
        path[i].joins.push structure
        structure.join =
          table: path[i].pivot
          fields: {}
        if through
          joined = "#{through.table}.#{through.column}"
        else
          joined = first.column
        structure.join.fields[join.column] = joined
        sql.push " FROM #{path[i].temporary} AS #{path[i].pivot}"
        from.value = "JOIN"
        break
    join.value = "#{join.table}.#{join.table}__#{join.column}"

  sql.push from.before
  sql.push from.value
  sql.push token.before
  sql.push token.value

  for token, i in scan
    switch token.type
      when "table"
        sql.push token.before
        sql.push token.value or ""
      when "table", "left", "right", "rest"
        sql.push token.before
        sql.push token.value or ""

  extend(structure, { sql: sql.join(""), parents, pivot, joins: [] })

  callback(structure, scan)
