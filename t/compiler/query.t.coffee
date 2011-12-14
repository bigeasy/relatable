#!/usr/bin/env coffee-streamline
return if not require("streamline/module")(module)

require("./harness") 12, ({ compiler, reflector }, _) ->
  schema = reflector _
  { structure } = compiler.compile "SELECT * FROM Product", schema, _
  expected = """
    SELECT Product.id AS Product__id,
           Product.manufacturerId AS Product__manufacturerId,
           Product.manufacturerCode AS Product__manufacturerCode,
           Product.name AS Product__name
      FROM Product
  """.trim().replace(/\s+/g, ' ')
  actual = structure.sql.trim().replace(/\s+/g, ' ')
  @equal actual, expected, "test correct query sql"
  @equal structure.pivot, "Product", "test correct query pivot"
  @deepEqual structure.parents, {}, "test correct query no parents"

  { structure } = compiler.compile """
    SELECT *
      FROM Product
      JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id
  """, schema, _
  expected = """
    SELECT Product.id AS Product__id,
           Product.manufacturerId AS Product__manufacturerId,
           Product.manufacturerCode AS Product__manufacturerCode,
           Product.name AS Product__name,
           Manufacturer.id AS Product__Manufacturer__id,
           Manufacturer.name AS Product__Manufacturer__name
      FROM Product
      JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id
  """.trim().replace(/\s+/g, ' ')
  length = 99999999999
  actual = structure.sql.trim().replace(/\s+/g, ' ').substring(0, length)
  @equal actual, expected.substring(0, length), "test correct join sql"
  @equal structure.pivot, "Product", "test correct join pivot"
  @deepEqual structure.parents, { "Manufacturer": "Product" }, "test correct join parents"

  { structure } = compiler.compile """
    SELECT * FROM  Manufacturer AS manufacturer
    SELECT *
      FROM Product AS products ON products.manufacturerId = manufacturer.id
  """, schema, _
  expected = """
    SELECT manufacturer.id AS manufacturer__id,
           manufacturer.name AS manufacturer__name
      FROM Manufacturer AS manufacturer
  """.trim().replace(/\s+/g, ' ')
  length = 2000
  actual = structure.sql.trim().replace(/\s+/g, ' ').substring(0, length)
  @equal expected.substring(0, length), actual, "test one to many parent sql"
  @equal structure.pivot, "manufacturer", "test one to many parent pivot"
  @deepEqual structure.parents, {}, "test one to many parent parents"
  expected = """
    SELECT products.id AS products__id,
           products.manufacturerId AS products__manufacturerId,
           products.manufacturerCode AS products__manufacturerCode,
           products.name AS products__name
      FROM relatable_temporary_N AS manufacturer
      JOIN Product AS products ON products.manufacturerId = manufacturer.manufacturer__id
  """.trim().replace(/\s+/g, ' ')
  length = 330
  actual = structure.joins[0].sql.trim().replace(/relatable_temporary_\d+/, "relatable_temporary_N").replace(/\s+/g, ' ').substring(0, length)
  @equal expected.substring(0, length), actual, "test one to many child sql"
  @equal structure.joins[0].pivot, "products", "test one to many child piviot"
  @deepEqual {
    table: "manufacturer",
    fields: { id: "manufacturerId" }
  }, structure.joins[0].join, "test one to many child joins"
