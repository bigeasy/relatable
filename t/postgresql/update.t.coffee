#!/usr/bin/env coffee-streamline
return if not require("streamline/module")(module)

require("./harness") 2, ({ relatable, resetManufacturer }, _) ->
  resetManufacturer _
  relatable.mutate _, (mutator, _) =>
    mutator.update "Manufacturer(id)", name: "Axme", id: 1, _
  manufacturers = relatable.select "SELECT * FROM manufacturer ORDER BY name", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Axme", ], "update"

  resetManufacturer _
  relatable.sql "INSERT INTO manufacturer (name) VALUES('Acme')", _
  relatable.mutate _, (mutator, _) =>
    result = mutator.update "Manufacturer(name) name", { name: "Acme" }, { name: "Axme" }, _
  manufacturers = relatable.select "SELECT * FROM manufacturer ORDER BY name", _
  names = (manufacturer.name for manufacturer in manufacturers)
  @deepEqual names, [ "Axme", "Axme", ], "update identity"
