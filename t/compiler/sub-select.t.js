#!/usr/bin/env node

require("./proof")(4, function (step, compiler, schema, placeholder, equal, deepEqual) {
  var structure, expected, actual, length;

  var compilation =
    compiler.compile(" \
      SELECT *,\
             (SELECT * \
                FROM Product AS products ON products.manufacturerId = manufacturer.id) \
      FROM  Manufacturer AS manufacturer \
    ", schema, placeholder);

    equal(compilation.structure.sql.trim().replace(/\s+/g, ' '),
          'SELECT manufacturer.id AS manufacturer__id, manufacturer.name AS manufacturer__name \
           FROM  Manufacturer AS manufacturer'.replace(/\s+/g, ' '), 'query');
    equal(compilation.structure.temporary, 'relatable_temporary_1', 'query temporary');
    var join = compilation.structure.joins[0];
    equal(join.sql.trim().replace(/\s+/g, ' '),
         'SELECT products.id AS products__id, \
                 products.manufacturerId AS products__manufacturerId, \
                 products.manufacturerCode AS products__manufacturerCode, \
                 products.name AS products__name \
            FROM relatable_temporary_1 AS manufacturer \
            JOIN Product AS products ON products.manufacturerId = manufacturer.manufacturer__id \
         '.trim().replace(/\s+/g, ' '), 'sub query');
    equal(join.pivot, 'products', 'pivot');
});
