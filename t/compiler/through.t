#!/usr/bin/env _coffee
require("./harness") 2, ({ compiler, reflector }, _) ->
  schema = reflector _
  { structure } = compiler.compile """
    SELECT products.*
      FROM SaleItem AS item
      JOIN Product AS products ON products.manufacturerId = item.manufacturerId
                              AND products.manufacturerCode = item.manufacturerCode
      WHERE item.sale_id = ? 
  """, schema, _
  expected = """
    SELECT products.id AS products__id,
           products.manufacturerId AS products__manufacturerId,
           products.manufacturerCode AS products__manufacturerCode,
           products.name AS products__name
      FROM SaleItem AS item
      JOIN Product AS products ON products.manufacturerId = item.manufacturerId
                              AND products.manufacturerCode = item.manufacturerCode
     WHERE item.sale_id = ? 
  """.trim().replace(/\s+/g, ' ')
  length = Math.MAX_VALUE
  actual = structure.sql.trim().replace(/relatable_temporary_\d+/, "relatable_temporary_N").replace(/\s+/g, ' ').substring(0, length)
  @equal actual, expected.substring(0, length), "test via join table sql"
  @equal structure.pivot, "products", "test via join table pivot"
