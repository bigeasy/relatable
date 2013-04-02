#!/usr/bin/env node

require("./proof")(7, function (compiler, schema, placeholder, equal, deepEqual) {
  var compilation =
    compiler.compile(" \
      SELECT *, \
        (SELECT *, \
              (SELECT * \
                 FROM saleitem AS item ON products.manufacturer_id = item.manufacturer_id \
                                      AND products.manufacturer_code = item.manufacturer_code \
               ) \
          FROM product AS products ON products.manufacturer_id = manufacturer.id \
          ) \
      FROM manufacturer \
    ", schema, placeholder);
    equal(compilation.structure.sql.trim().replace(/\s+/g, ' '), '\
          SELECT manufacturer.id AS manufacturer__id, \
                 manufacturer.name AS manufacturer__name \
            FROM manufacturer \
      '.trim().replace(/\s+/g, ' '), 'query');
    equal(compilation.structure.temporary, 'relatable_temporary_1', 'query temporary');
    equal(compilation.structure.joins.length, 1, 'join count');
    var join = compilation.structure.joins[0];
    equal(join.sql.trim().replace(/\s+/g, ' '), '\
          SELECT products.id AS products__id, \
                 products.manufacturerId AS products__manufacturerId, \
                 products.manufacturerCode AS products__manufacturerCode, \
                 products.name AS products__name \
            FROM relatable_temporary_1 AS manufacturer \
            JOIN product AS products \
                         ON products.manufacturer_id = manufacturer.manufacturer__id \
    '.trim().replace(/\s+/g, ' '), 'sub query');
    equal(join.pivot, 'products', 'pivot');
    equal(join.joins.length, 1, 'nested join count');
    join = join.joins[0];
    equal(join.sql.trim().replace(/\s+/g, ' '), '\
          SELECT item.id AS item__id, \
                 item.saleId AS item__saleId, \
                 item.quantity AS item__quantity, \
                 item.price AS item__price, \
                 item.manufacturerId AS item__manufacturerId, \
                 item.manufacturerCode AS item__manufacturerCode \
            FROM relatable_temporary_2 AS products \
            JOIN saleitem AS item \
                          ON products.products__manufacturer_id = item.manufacturer_id \
                         AND products.products__manufacturer_code = item.manufacturer_code \
    '.trim().replace(/\s+/g, ' '), 'nested sub query');
});
