#!/usr/bin/env node

require("./proof")(2, function (step, equal, compiler, schema) {
  var structure, actual, expected, length;

  step(function () {
    compiler.compile(" \
      SELECT products.* \
        FROM SaleItem AS item \
        JOIN Product AS products ON products.manufacturerId = item.manufacturerId \
                                AND products.manufacturerCode = item.manufacturerCode \
        WHERE item.sale_id = ? \
    ", schema, step());
  },


  function (compilation) {
    structure = compilation.structure;
    expected = " \
      SELECT products.id AS products__id, \
             products.manufacturerId AS products__manufacturerId, \
             products.manufacturerCode AS products__manufacturerCode, \
             products.name AS products__name \
        FROM SaleItem AS item \
        JOIN Product AS products ON products.manufacturerId = item.manufacturerId \
                                AND products.manufacturerCode = item.manufacturerCode \
       WHERE item.sale_id = ? \
    ".trim().replace(/\s+/g, ' ');
    length = Math.MAX_VALUE;
    actual = structure.sql.trim()
                      .replace(/relatable_temporary_\d+/, "relatable_temporary_N")
                      .replace(/\s+/g, ' ').substring(0, length);
    equal(actual, expected.substring(0, length), "test via join table sql");
    equal(structure.pivot, "products", "test via join table pivot");
  });
});
