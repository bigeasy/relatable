#!/usr/bin/env node

// Test harness to test MySQL update.
require("./proof")(2, function (step, relatable, resetManufacturer, deepEqual) {
  var mutator;

  step(function () {

    resetManufacturer(step())

  }, function () {

    relatable.sql("INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", step());

  }, function () {

    mutator = relatable.mutate();
    mutator.delete("Manufacturer(name)", { name: "Yoyodyne", id: 1 });
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());

  }, function (manufacturers) {
    
    var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
    deepEqual(names, [ "Acme" ], "with key");

    resetManufacturer(step());

  }, function () {

    relatable.sql("INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", step()); 

  }, function () {

    mutator = relatable.mutate();
    mutator.delete("Manufacturer", { name: "Yoyodyne" }, step());
    mutator.commit(step());

  }, function () {

    relatable.select("SELECT * FROM Manufacturer", step());

  }, function (manufacturers) {
    
    var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
    deepEqual(names, [ "Acme" ], "no key");

  });
});
