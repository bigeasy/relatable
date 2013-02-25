#!/usr/bin/env node

require("./proof")(5, function (async, relatable, resetManufacturer, equal, deepEqual) {
  var mutator;

  async(function () {

    resetManufacturer(async());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(id)", { name: "Axme", id: 1 });
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());

  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "key only");
  
    resetManufacturer(async());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(id) name", { name: "Axme", id: 1 });
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());
  
  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "specific field");

    resetManufacturer(async());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update({
      table:      "Manufacturer",
      parameters: { name: "Axme" },
      where:      { id: 1 }
    });
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());
  
  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "explicit");

    resetManufacturer(async());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(id) name = 'Axme'", { name: "Axme", id: 1 });
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());
  
  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "with literal");

    resetManufacturer(async());

  }, function () {

    relatable.sql("INSERT INTO Manufacturer (name) VALUES('Acme')", async());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(name) name", { name: "Acme" }, { name: "Axme" });
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());
  
  }, function (manufacturers) {

    var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
    deepEqual(names, [ "Axme", "Axme" ], "update identity one");
  
  });
});
