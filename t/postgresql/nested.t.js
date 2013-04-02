#!/usr/bin/env node

require("./proof")(1, function (step, relatable, resetManufacturer, deepEqual) {
  step(function () {

    resetManufacturer(step());

  }, function () {

    relatable.select(" \
      SELECT *, \
        (SELECT *, \
              (SELECT * \
                 FROM sale_item AS item \
                                ON products.manufacturer_id = item.manufacturer_id \
                               AND products.manufacturer_code = item.manufacturer_code \
               ) \
          FROM product AS products ON products.manufacturer_id = manufacturer.id \
          ) \
      FROM manufacturer \
    ", step());

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
