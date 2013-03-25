#!/usr/bin/env node

require("./proof")(6, function (step, compiler, schema, placeholder, equal, deepEqual) {
  var structure, expected, actual, length;

  step(function () {
    compiler.compile("SELECT * FROM Product", schema, placeholder, step());
  },

  function (compilation) {
    structure = compilation.structure;
    expected = " \
      SELECT Product.id AS Product__id, \
             Product.manufacturerId AS Product__manufacturerId, \
             Product.manufacturerCode AS Product__manufacturerCode, \
             Product.name AS Product__name \
        FROM Product \
    ".trim().replace(/\s+/g, ' ');
    actual = structure.sql.trim().replace(/\s+/g, ' ');

    equal(actual, expected, "test correct query sql");
    equal(structure.pivot, "Product", "test correct query pivot");
    deepEqual(structure.parents, {}, "test correct query no parents");

    compiler.compile(" \
      SELECT * \
        FROM Product \
        JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id \
    ", schema, placeholder, step());
  },

  function (compilation) {
    structure = compilation.structure;
    expected = " \
      SELECT Product.id AS Product__id, \
             Product.manufacturerId AS Product__manufacturerId, \
             Product.manufacturerCode AS Product__manufacturerCode, \
             Product.name AS Product__name, \
             Manufacturer.id AS Product__Manufacturer__id, \
             Manufacturer.name AS Product__Manufacturer__name \
        FROM Product \
        JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id \
    ".trim().replace(/\s+/g, ' ');
    length = 99999999999;
    actual = structure.sql.trim().replace(/\s+/g, ' ').substring(0, length);

    equal(actual, expected.substring(0, length), "test correct join sql");
    equal(structure.pivot, "Product", "test correct join pivot");
    deepEqual(structure.parents, { "Manufacturer": "Product" }, "test correct join parents");
  });
});
