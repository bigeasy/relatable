{parser} = require "./grammar.js"
scanner = require "./scanner"

exports.selector = (sql, reflector, callback) ->
  scan = scanner.scan sql
  all = false
  expansions = []
  tables = []
  for token in scan
    switch token.type
      when "all"
        expansions.push token
      when "table"
        tables.push table =
          token: token
          columns: []
  for expansion in expansions
    if expansion.type is "all"
      expansion.expansions = []
      for table in tables
        expansion.expansions.push [ table.token.name, table.token.alias ]
  seen = {}
  selected = []
  parents = {}
  reflect = ->
    if expansions[0].expansions.length
      [ table, alias ] = expansions[0].expansions.shift()
      reflector table, (reflected) ->
        for column in reflected.columns
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
      relfect()
    else
      sql = []
      select = scan.shift()
      sql.push select.before
      sql.push selected.join(", ")
      for token in scan
        switch token.type
          when "table", "left", "right"
            sql.push token.before
            sql.push token.value or ""
      callback(sql.join(""), ->)
  reflect_ = ->
    if true
      console.log "TRUE"
    else if columns.length
      column = columns.shift()
      reflector column.table, (reflected) ->
        for name in reflected.columns
          qualifiedName = "#{column.table}.#{name}"
          if not seen[qualifiedName]
            seen[qualifiedName] = true
            prefix = []
            current = tables[column.table]
            while current?
              prefix.push current.datasource.name
              current = tables[current.parent]
            prefix.reverse()
            prefix.push name
            selected.push "#{qualifiedName} AS #{prefix.join("__")}"
        reflect()
    else
      rewrite = []
      rewrite.push "SELECT"
      rewrite.push selected.join(", ")
      keyword = "FROM"
      for join in tree.joins
        rewrite.push keyword
        rewrite.push join.datasource.name
        if keyword is "JOIN"
          rewrite.push "ON"
          for condition in join.conditions
            rewrite.push condition.left
            rewrite.push "="
            rewrite.push condition.right
        keyword = "JOIN"
      rewrite.push tree.test
      callback(rewrite.join(" "), ->)
  reflect()

exports.xselector = (sql, reflector, callback) ->
  tree = parser.parse sql
  columns = []
  tables = {}
  for column in tree.select.columns
    if column is "*"
      for join in tree.joins
        if join.datasource.type is "table"
          tables[join.datasource.name] = join
          columns.push { table: join.datasource.name, alias: join.datasource.name, column: "*" }
          if join.conditions
            seen = {}
            for condition in join.conditions
              [ table, field ] = /^([^.]+)\..*$/.exec(condition.left).slice(1)
              if table isnt join.datasource.name
                if not join.parent
                  join.parent = table
                else if join.parent isnt table
                  throw new Error "unable to figure out multi-table join"
  seen = {}
  selected = []
  reflect = ->
    if columns.length
      column = columns.shift()
      reflector column.table, (reflected) ->
        for name in reflected.columns
          qualifiedName = "#{column.table}.#{name}"
          if not seen[qualifiedName]
            seen[qualifiedName] = true
            prefix = []
            current = tables[column.table]
            while current?
              prefix.push current.datasource.name
              current = tables[current.parent]
            prefix.reverse()
            prefix.push name
            selected.push "#{qualifiedName} AS #{prefix.join("__")}"
        reflect()
    else
      rewrite = []
      rewrite.push "SELECT"
      rewrite.push selected.join(", ")
      keyword = "FROM"
      for join in tree.joins
        rewrite.push keyword
        rewrite.push join.datasource.name
        if keyword is "JOIN"
          rewrite.push "ON"
          for condition in join.conditions
            rewrite.push condition.left
            rewrite.push "="
            rewrite.push condition.right
        keyword = "JOIN"
      rewrite.push tree.test
      callback(rewrite.join(" "), ->)
  reflect()
