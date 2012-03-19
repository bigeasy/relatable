#!/usr/bin/env _coffee

count = 0
# Test harness to test MySQL update.
require("./harness") 2, ({ relatable, resetManufacturer }, _) ->
  resetManufacturer(_)
  relatable.sql "INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", _
  relatable.mutate _, (mutator, _) ->
    mutator.delete "Manufacturer(name)", { name: "Yoyodyne", id: 1 }, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  names = (manufacturer.name for manufacturer in manufacturers)
  expected = [ "Acme" ]
  @deepEqual names, expected, "with key"

  resetManufacturer _
  relatable.sql "INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", _
  relatable.mutate _, (mutator, _) ->
    mutator.delete "Manufacturer", { name: "Yoyodyne" }, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  names = (manufacturer.name for manufacturer in manufacturers)
  expected = [ "Acme" ]
  @deepEqual names, expected, "no key"
