#!/usr/bin/env node

require("./proof")(1, function (step, relatable, resetManufacturer, deepEqual) {
  step(function () {

    resetManufacturer(step());

  }, function () {

    relatable.select(" \
        SELECT *, \
              (SELECT * \
                 FROM sale_item AS items ON product.manufacturer_id = items.manufacturer_id \
                                        AND product.manufacturer_code = items.manufacturer_code \
               )\
          FROM product \
      ", step());

  }, function (results) {

    deepEqual(
      [ { id: 1,
          name: 'Heavy Anvil',
          manufacturerCode: 'A',
          manufacturerId: 1,
          items:
           [ { id: 1,
               price: 44.99,
               quantity: 2,
               manufacturerCode: 'A',
               manufacturerId: 1,
               saleId: 1 } ] } ], results, "join through");

  });
});
