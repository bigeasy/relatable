#!/usr/bin/env node

require("./proof")(1, function (step, relatable, resetManufacturer, deepEqual) {
  step(function () {

      resetManufacturer(step());

  }, function () {

      relatable.select("SELECT * FROM product WHERE id = $id", { id: 1 }, step());

  }, function (results) {

      deepEqual([
        { id: 1
        , manufacturerId: 1
        , manufacturerCode: 'A'
        , name: 'Heavy Anvil'
        }
      ], results, "select");

  });
});
