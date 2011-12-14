scanner = require "./scanner"
{extend} = require("coffee-script").helpers

identifier = 0

exports.update = (definition, splat...) ->
  if typeof definition is "object" and splat.length is 0
    operation = type: "update"
    operation[key] = value for key, value of definition
  else
    update = scanner.mutation definition, tableOnly: false
    if splat.length is 2
      [ where, object ] = splat
    else
      object = where = splat[0]
    operation =
      type: "update"
      table: update.table
      literals: update.literals
      parameters: {}
      where: {}

    for column in update.where
      operation.where[column] = where[column]
    
    if update.columns.length is 0
      star = Object.keys(operation.literals).length is 0
    else
      for column in update.columns
        if column is "*"
          star = true
          break
        else
          operation.parameters[column] = object[column]
    
    if star
      for column, value of object
        if update.where.indexOf(column) is -1
          operation.parameters[column] = value

  operation

exports.delete = (definition, object) ->
  if typeof definition is "object"
    operation = type: "delete"
    operation[key] = value for key, value of definition
  else
    _delete = scanner.mutation definition, tableOnly: true
    operation =
      type: "delete"
      table: _delete.table
      where: {}
    if _delete.where.length is 0
      operation.where[key] = value for key, value of object
    else
      operation.where[key] = object[key] for key in _delete.where
  operation

exports.insert = (definition, object) ->
  if typeof definition is "object"
    operation =
      type: "insert"
      returning: []
      parameters: {}
      literals: {}
    operation[key] = value for key, value of definition
  else
    insert = scanner.mutation definition, tableOnly: true
    operation =
      type: "insert"
      table: insert.table
      returning: insert.where
      parameters: {}
      literals: insert.literals

    if insert.columns.length is 0
      star = not (key for key of insert.literals).length
    else
      for column in insert.columns
        if column is "*"
          star = true
          break
        else
          operation.parameters[column] = object[column]

    if star
      operation.parameters[key] = value for key, value of object
  operation

exports.compile = (sql, schema, callback) ->
  scan = scanner.query sql

  # Split the scan into separate select statements.
  selects = [ [] ]
  for part in scan
    selects[0].push part
    selects.unshift [] if part.type is "rest"
  compileSelect [], selects.pop(), schema, (error, { structure }) ->
    compileSelects [ structure ], selects, schema, callback

compileSelects = (path, selects, schema, callback) ->
  if selects.length is 1
    callback(null, { structure: path[0] })
  else
    compileSelect path, selects.pop(), schema, (error, { structure, scan }) ->
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

  callback(null, { structure, scan })
