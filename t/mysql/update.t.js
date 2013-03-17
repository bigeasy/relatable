#!/usr/bin/env node

// Test harness to test MySQL update.

require("./proof")(5, function (step, relatable, resetManufacturer, equal, deepEqual) {
  var mutator;

  step(function () {

    resetManufacturer(step());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(id)", { name: "Axme", id: 1 });
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());

  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "key only");
  
    resetManufacturer(step());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(id) name", { name: "Axme", id: 1 });
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());
  
  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "specific field");

    resetManufacturer(step());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update({
      table:      "Manufacturer",
      parameters: { name: "Axme" },
      where:      { id: 1 }
    });
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());
  
  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "explicit");

    resetManufacturer(step());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(id) name = 'Axme'", { name: "Axme", id: 1 });
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());
  
  }, function (manufacturers) {

    equal("Axme", manufacturers[0].name, "with literal");

    resetManufacturer(step());

  }, function () {

    relatable.sql("INSERT INTO Manufacturer (name) VALUES('Acme')", step());

  }, function () {

    mutator = relatable.mutate();  
    mutator.update("Manufacturer(name) name", { name: "Acme" }, { name: "Axme" });
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());
  
  }, function (manufacturers) {

    var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
    deepEqual(names, [ "Axme", "Axme" ], "update identity one");
  
  });
});
