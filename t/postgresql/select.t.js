#!/usr/bin/env node

require("./proof")(3, function (step, relatable, resetManufacturer, deepEqual) {
  var mutator;

  step(function () {

      resetManufacturer(step());

  }, function () {

      relatable.select("SELECT * FROM product", step());

  }, function (results) {

      deepEqual([
        { id: 1
        , manufacturerId: 1
        , manufacturerCode: 'A'
        , name: 'Heavy Anvil'
        }
      ], results, "select");

      relatable.select(" \
          SELECT *, ( \
                 SELECT * \
                   FROM product AS products ON products.manufacturer_id = manufacturer.id \
                 ) \
            FROM manufacturer \
        ", step());

  }, function  (results) {

      deepEqual([
        { id: 1
        , name: 'Acme'
        , products: [{ id:1,  manufacturerId:1, manufacturerCode: "A", name:"Heavy Anvil" }]
        }
      ], results, "join");

      relatable.select(" \
          SELECT *, ( \
                 SELECT products.* \
                   FROM sale_item AS item ON item.sale_id = sale.id \
                   JOIN product AS products ON products.manufacturer_id = item.manufacturer_id \
                                           AND products.manufacturer_code = item.manufacturer_code \
                 ) \
            FROM sale \
        ", step());

  }, function (results) {

      deepEqual([ {
        id: 1,
        customerId: 1,
        products: [
          {
            id: 1,
            manufacturerId: 1,
            manufacturerCode: "A",
            name: "Heavy Anvil",
            item: { saleId: 1 }
          }
        ]
      } ], results, "join through");

  });
});
