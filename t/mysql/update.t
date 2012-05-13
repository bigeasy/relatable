#!/usr/bin/env _coffee

# Test harness to test MySQL update.

require("./harness") 5, ({ relatable, resetManufacturer }, _) ->
  resetManufacturer _
  relatable.mutate _, (mutator, _) ->
    mutator.update "Manufacturer(id)", name: "Axme", id: 1, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  @equal "Axme", manufacturers[0].name, "key only"
  
  resetManufacturer _
  relatable.mutate _, (mutator, _) ->
    mutator.update "Manufacturer(id) name", name: "Axme", id: 1, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  @equal "Axme", manufacturers[0].name, "specific field"

  resetManufacturer _
  relatable.mutate _, (mutator, _) ->
    update =
      table:      "Manufacturer",
      parameters: { name: "Axme" }
      where:      { id: 1 }
    mutator.update update, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  @equal "Axme", manufacturers[0].name, "explicit"

  resetManufacturer _
  relatable.mutate _, (mutator, _) ->
    mutator.update "Manufacturer(id) name = 'Axme'", name: "Axme", id: 1, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  @equal "Axme", manufacturers[0].name, "with literal"

  resetManufacturer _
  relatable.sql "INSERT INTO Manufacturer (name) VALUES('Acme')", _
  relatable.mutate _, (mutator, _) ->
    mutator.update "Manufacturer(name) name", { name: "Acme" }, { name: "Axme" }, _
  manufacturers = relatable.select "SELECT * FROM Manufacturer", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Axme", "Axme" ], "update identity one"
