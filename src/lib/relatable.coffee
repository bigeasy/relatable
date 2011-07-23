{parser} = require "./grammar.js"

exports.selector = (sql, reflector, callback) ->
  tree = parser.parse sql
  columns = []
  seen = {}
  for column in tree.select.columns
    if column is "*"
      for join in tree.joins
        if join.datasource.type is "table"
          columns.push { table: join.datasource.name, alias: join.datasource.table, column: "*" }
  selected = []
  reflect = ->
    if columns.length
      column = columns.shift()
      reflector column.table, (reflected) ->
        for name in reflected.columns
          qualifiedName = "#{column.table}.#{name}"
          if not seen[qualifiedName]
            seen[qualifiedName] = true
            selected.push "#{qualifiedName} AS #{column.table}__#{name}"
        reflect()
    else
      rewrite = []
      rewrite.push "SELECT"
      rewrite.push selected.join(", ")
      keyword = "FROM"
      for join in tree.joins
        rewrite.push keyword
        rewrite.push join.datasource.name
        keyword = "JOIN"
      rewrite.push tree.test
      callback(rewrite.join(" "), ->)
  reflect()
    
