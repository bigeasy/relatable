#!/usr/bin/env _coffee

require("./proof") 2, (compiler, object) ->
  expected =
    type: "delete"
    table: "Section"
    where: object
  actual = compiler.delete "Section", object
  @deepEqual actual, expected, "table only"

  expected =
    type: "delete"
    table: "Section"
    where: { id: 1 }
  actual = compiler.delete "Section(id)", object
  @deepEqual actual, expected, "with key"
