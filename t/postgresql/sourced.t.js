#!/usr/bin/env node

require("./proof")(1, function (step, relatable, resetManufacturer, deepEqual) {
  step(function () {

    resetManufacturer(step());

  }, function () {

    relatable.select(__dirname, "sourced.sql", { manufacturerId: 1 }, step());

  }, function (results) {

    deepEqual(
      [ { id: 1,
          name: 'Acme',
          products:
           [ { id: 1,
               name: 'Heavy Anvil',
               manufacturerCode: 'A',
               manufacturerId: 1,
               item:
                [ { id: 1,
                    price: 44.99,
                    quantity: 2,
                    manufacturerCode: 'A',
                    manufacturerId: 1,
                    saleId: 1 } ] } ] } ], results, "join through");

  });
});
