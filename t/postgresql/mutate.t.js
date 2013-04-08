#!/usr/bin/env node

require("./proof")(1, function (step, resetManufacturer, relatable, deepEqual) {
  var mutator;

  step(function () {

      resetManufacturer(step());

  }, function () {

      mutator = relatable.mutate();
      mutator.sql("SELECT * FROM product", step());

  }, function (result) {

    deepEqual(result.rows,
       [ { id: 1,
           manufacturer_id: 1,
           manufacturer_code: 'A',
           name: 'Heavy Anvil' } ], 'sql');
    mutator.rollback();

  });
});
