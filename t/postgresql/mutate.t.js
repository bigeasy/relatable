#!/usr/bin/env node

require("./proof")(3, function (step, resetManufacturer, relatable, deepEqual) {
  var mutator;

  step(function () {

      resetManufacturer(step());

  }, function () {

      mutator = relatable.mutate();
      mutator.insert("Manufacturer name", { name: "Omni Consumer Products" });
      mutator.insert("Manufacturer", { name: "Yoyodyne" });
      mutator.sql("SELECT name FROM manufacturer ORDER BY name", step());

  }, function (result) {

      deepEqual(result.rows,
         [ { name: "Acme" },
           { name: "Omni Consumer Products" },
           { name: "Yoyodyne" } ], 'sql');

      mutator.select("SELECT * FROM manufacturer ORDER BY name", step());

  }, function (result) {

      deepEqual(
        result.map(function (manufacturer) { return manufacturer.name }),
         [ "Acme", "Omni Consumer Products", "Yoyodyne" ], 'select');

  }, function () {

    relatable.select("SELECT * FROM manufacturer ORDER BY name", step());

  }, function (result) {

      deepEqual(
        result.map(function (manufacturer) { return manufacturer.name }),
         [ "Acme" ], 'isolated');

      mutator.rollback();

  });

});
