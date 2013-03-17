#!/usr/bin/env node

// Test harness to test MySQL update.

require("./proof")(7, function (step, relatable, resetManufacturer, ok, equal, deepEqual) {
  var mutator;

  step(function () {

      resetManufacturer(step());

  }, function () {

      mutator = relatable.mutate();
      mutator.insert("Manufacturer", { name: "Yoyodyne" });
      mutator.insert("Manufacturer name", { name: "Omni Consumer Products" });
      mutator.commit(step());

  }, function (mutation) {

      equal(mutation[0].id + 1, mutation[1].id, "insert returing");

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", step());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Omni Consumer Products", "Yoyodyne" ], "insert");

      resetManufacturer(step());

  }, function () {

      var insertion = {
        table: "Manufacturer",
        returning: [ "id" ],
        parameters: { name: "Yoyodyne" }
      };
      mutator = relatable.mutate();
      mutator.insert(insertion, step());

  }, function (inserted) {

      ok(inserted.id, "insertion explicit returning");

      mutator.commit(step());

  }, function () {

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", step());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert explicit");

      resetManufacturer(step());
  
  }, function () {

      mutator = relatable.mutate();
      mutator.insert("Manufacturer(id) name = 'Yoyodyne'", step());

  }, function (returning) {

      ok(returning.id, "insertion literal returning");

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", step());
      mutator.commit(step()); // commit but discard return.

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert explicit");

      resetManufacturer(step());

  }, function () {

      mutator = relatable.mutate();
      mutator.insertIf("Manufacturer(name) name", { name: "Acme" });
      mutator.insertIf("Manufacturer(name)", { name: "Yoyodyne" });
      mutator.commit(step());

  }, function () {

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", step());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert if");

  });
});
