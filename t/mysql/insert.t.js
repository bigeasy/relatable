#!/usr/bin/env node

// Test harness to test MySQL update.

require("./proof")(7, function (async, relatable, resetManufacturer, ok, equal, deepEqual) {
  var mutator;

  async(function () {

      resetManufacturer(async());

  }, function () {

      mutator = relatable.mutate();
      mutator.insert("Manufacturer", { name: "Yoyodyne" });
      mutator.insert("Manufacturer name", { name: "Omni Consumer Products" });
      mutator.commit(async());

  }, function (mutation) {

      equal(mutation[0].id + 1, mutation[1].id, "insert returing");

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", async());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Omni Consumer Products", "Yoyodyne" ], "insert");

      resetManufacturer(async());

  }, function () {

      var insertion = {
        table: "Manufacturer",
        returning: [ "id" ],
        parameters: { name: "Yoyodyne" }
      };
      mutator = relatable.mutate();
      mutator.insert(insertion, async());

  }, function (inserted) {

      ok(inserted.id, "insertion explicit returning");

      mutator.commit(async());

  }, function () {

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", async());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert explicit");

      resetManufacturer(async());
  
  }, function () {

      mutator = relatable.mutate();
      mutator.insert("Manufacturer(id) name = 'Yoyodyne'", async());

  }, function (returning) {

      ok(returning.id, "insertion literal returning");

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", async());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert explicit");

      resetManufacturer(async());

  }, function () {

      mutator = relatable.mutate();
      mutator.insertIf("Manufacturer(name) name", { name: "Acme" });
      mutator.insertIf("Manufacturer(name)", { name: "Yoyodyne" });
      mutator.commit(async());

  }, function () {

      relatable.select("SELECT * FROM Manufacturer ORDER BY name", async());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert if");

  });
});
