#!/usr/bin/env node

require("./proof")(2, function (async, relatable, resetManufacturer, ok, equal, deepEqual) {
  var mutator;

  async(function () {

      resetManufacturer(async());

  }, function () {

      mutator = relatable.mutate();
      mutator.insert("Manufacturer(id)", { name: "Yoyodyne" });
      mutator.insert("Manufacturer(id) name", { name: "Omni Consumer Products" });
      mutator.commit(async());

  }, function (mutation) {

      equal(mutation[0].id + 1, mutation[1].id, "insert returing");

      relatable.select("SELECT * FROM manufacturer ORDER BY name", async());

  }, function (manufacturers) {

      var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
      deepEqual(names, [ "Acme", "Omni Consumer Products", "Yoyodyne" ], "insert");

  });
});
