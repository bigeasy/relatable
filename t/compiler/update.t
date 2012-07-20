#!/usr/bin/env coffee
require("./proof") 5, (object, compiler, deepEqual) ->
  expected =
    type: "update"
    table: "Section"
    where: { id: 1 }
    parameters: { rgt: 1, lft: 2, permalink: "home" }
    literals: {}
  actual = compiler.update "Section(id)", object
  deepEqual actual, expected, "key only"

  expected =
    type: "update"
    table: "Section"
    where: { id: 1 }
    parameters: { rgt: 1, lft: 2 }
    literals: {}
  actual = compiler.update "Section(id) rgt, lft", object
  deepEqual actual, expected, "with set"

  expected =
    type: "update"
    table: "Section"
    where: { id: 1 }
    parameters: { rgt: 1, lft: 2, permalink: "home" }
    literals: {}
  actual = compiler.update "Section(id) *", object
  deepEqual actual, expected, "star only"

  expected =
    type: "update"
    table: "Section"
    where: { id: 1 }
    parameters: { rgt: 1, lft: 2, permalink: "home" }
    literals: {}
  actual = compiler.update "Section(id) rgt, lft, *", object
  deepEqual actual, expected, "star and set"

  expected =
    type: "update"
    table: "Section"
    where: { id: 1 }
    parameters: { rgt: 1, lft: 2, permalink: "home" }
    literals:
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
  actual = compiler.update """
    Section(id) *, updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j'),
  """, object
  deepEqual actual, expected, "star and literals"
