#!/usr/bin/env node

require("./proof")(5, function (compiler, schema, placeholder, equal, deepEqual) {
  var compilation =
    compiler.compile(" \
      SELECT *, \
            (SELECT * \
               FROM saleitem AS item ON product.manufacturer_id = item.manufacturer_id \
                                     AND product.manufacturer_code = item.manufacturer_code \
             )\
        FROM product \
    ", schema, placeholder);
    equal(compilation.structure.sql.trim().replace(/\s+/g, ' '), '\
           SELECT product.id AS product__id, \
                  product.manufacturerId AS product__manufacturerId, \
                  product.manufacturerCode AS product__manufacturerCode, \
                  product.name AS product__name FROM product \
           '.trim().replace(/\s+/g, ' '), 'query');
    equal(compilation.structure.temporary, 'relatable_temporary_1', 'query temporary');
    equal(compilation.structure.joins.length, 1, 'join count');
    var join = compilation.structure.joins[0];
    equal(join.sql.trim().replace(/\s+/g, ' '), '\
          SELECT item.id AS item__id, \
                 item.saleId AS item__saleId, \
                 item.quantity AS item__quantity, \
                 item.price AS item__price, \
                 item.manufacturerId AS item__manufacturerId, \
                 item.manufacturerCode AS item__manufacturerCode \
            FROM relatable_temporary_1 AS product \
            JOIN saleitem AS item ON product.product__manufacturer_id = item.manufacturer_id \
                                 AND product.product__manufacturer_code = item.manufacturer_code \
         '.trim().replace(/\s+/g, ' '), 'sub query');
    equal(join.pivot, 'item', 'pivot');
});
