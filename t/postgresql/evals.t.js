#!/usr/bin/env node

require("./proof")(1, function (step, relatable, resetManufacturer, deepEqual) {
  step(function () {

      resetManufacturer(step());

  }, function () {

      relatable.select("\
        SELECT * \
          FROM product \
         WHERE id = { $.id - 1 } \
         LIMIT { $.limit || 1 } \
      ", { id: 2 }, step());

  }, function (results) {

      deepEqual(results, [
        { id: 1
        , manufacturerId: 1
        , manufacturerCode: 'A'
        , name: 'Heavy Anvil'
        }
      ], "evaluated");

  });
});
