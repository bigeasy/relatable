#!/usr/bin/env coffee-streamline
return if not require("streamline/module")(module)

require("./harness") 2, ({ relatable, resetManufacturer }, _) ->
  resetManufacturer _
  relatable.mutate _, (mutator, _) =>
    first = mutator.insert "Manufacturer(id)", name: "Yoyodyne", _
    second = mutator.insert "Manufacturer(id) name", name: "Omni Consumer Products", _
    @equal first.id + 1, second.id, "insert returning"
  manufacturers = relatable.select "SELECT * FROM manufacturer ORDER BY name", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Acme", "Omni Consumer Products", "Yoyodyne" ], "insert"
