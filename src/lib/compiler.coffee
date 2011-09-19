scanner = require "./scanner"

exports.compile = (sql, reflector, callback) ->
  scan = scanner.scan sql
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
      callback({ sql: sql.join("") })
  reflect()
