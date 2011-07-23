{parser} = require "./grammar.js"

exports.selector = (sql, reflector, callback) ->
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
