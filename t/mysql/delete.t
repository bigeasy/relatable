#!/usr/bin/env _coffee

# Test harness to test MySQL update.
require("./proof") 2, (relatable, resetManufacturer, deepEqual, _) ->
  resetManufacturer(_)
  relatable.sql "INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", _
  relatable.mutate _, (mutator, _) ->
    mutator.delete "Manufacturer(name)", { name: "Yoyodyne", id: 1 }, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  names = (manufacturer.name for manufacturer in manufacturers)
  expected = [ "Acme" ]
  deepEqual names, expected, "with key"

  resetManufacturer _
  relatable.sql "INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", _
  relatable.mutate _, (mutator, _) ->
    mutator.delete "Manufacturer", { name: "Yoyodyne" }, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  names = (manufacturer.name for manufacturer in manufacturers)
  expected = [ "Acme" ]
  deepEqual names, expected, "no key"
