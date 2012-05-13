#!/usr/bin/env _coffee

# Test harness to test MySQL update.

require("./harness") 6, ({ relatable, resetManufacturer }, _) ->
  resetManufacturer _
  relatable.mutate _, (mutator, _) =>
    first = mutator.insert "Manufacturer(id)", name: "Yoyodyne", _
    second = mutator.insert "Manufacturer(id) name", name: "Omni Consumer Products", _
    @equal first.id + 1, second.id, "insert returning"
  manufacturers = relatable.select "SELECT * FROM Manufacturer ORDER BY name", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Acme", "Omni Consumer Products", "Yoyodyne" ], "insert"

  resetManufacturer _
  relatable.mutate _, (mutator, _) =>
    insertion =
      table: "Manufacturer"
      returning: [ "id" ]
      parameters:
        name: "Yoyodyne"
    returning = mutator.insert insertion, _
    @ok returning.id, "insertion explicit returning"
  manufacturers = relatable.select "SELECT * FROM Manufacturer ORDER BY name", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Acme", "Yoyodyne" ], "insert explicit"

  resetManufacturer _
  relatable.mutate _, (mutator, _) =>
    returning = mutator.insert "Manufacturer(id) name = 'Yoyodyne'", _
    @ok returning.id, "insertion literal returning"
  manufacturers = relatable.select "SELECT * FROM Manufacturer ORDER BY name", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Acme", "Yoyodyne" ], "insert literal"
