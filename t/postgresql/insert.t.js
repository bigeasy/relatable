#!/usr/bin/env node

require("./proof")(3, function (step, relatable, resetManufacturer, ok, equal, deepEqual) {
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

      relatable.select("SELECT * FROM manufacturer ORDER BY name", step());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Omni Consumer Products", "Yoyodyne" ], "insert");

      resetManufacturer(step());

  }, function () {

      mutator = relatable.mutate();
      mutator.insertIf("Manufacturer(name) name", { name: "Acme" });
      mutator.insertIf("Manufacturer(name)", { name: "Yoyodyne" });
      mutator.commit(step());

  }, function () {

      relatable.select("SELECT * FROM manufacturer ORDER BY name", step());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Yoyodyne" ], "insert if");

  });
});
