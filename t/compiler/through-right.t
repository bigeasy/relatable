#!/usr/bin/env _coffee
require("./proof") 5, ({ compiler, reflector }, _) ->
  schema = reflector _
  { structure } = compiler.compile """
    SELECT * FROM Sale AS sale
    SELECT products.*
      FROM SaleItem AS item ON sale.id = item.saleId
      JOIN Product AS products ON products.manufacturerId = item.manufacturerId
                              AND products.manufacturerCode = item.manufacturerCode
  """, schema, _
  expected = """
    SELECT sale.id AS sale__id,
           sale.customerId AS sale__customerId
      FROM Sale AS sale
  """.trim().replace(/\s+/g, ' ')
  length = Math.MAX_VALUE
  actual = structure.sql.trim().replace(/\s+/g, ' ').substring(0, length)
  @equal expected.substring(0, length), actual, "parent sql"
  expected = """
    SELECT products.id AS products__id,
           products.manufacturerId AS products__manufacturerId,
           products.manufacturerCode AS products__manufacturerCode,
           products.name AS products__name,
           item.saleId AS products__item__saleId
      FROM relatable_temporary_N AS sale
      JOIN SaleItem AS item ON sale.sale__id = item.saleId
      JOIN Product AS products ON products.manufacturerId = item.manufacturerId
                              AND products.manufacturerCode = item.manufacturerCode
  """.trim().replace(/\s+/g, ' ')
  length = Math.MAX_VALUE
  actual = structure.joins[0].sql.trim().replace(/relatable_temporary_\d+/, "relatable_temporary_N").replace(/\s+/g, ' ').substring(0, length)
  @equal expected.substring(0, length), actual, "child sql"
  @equal structure.joins[0].pivot, "products", "child pivot"
  @equal structure.joins[0].join.table, "sale", "child join table"
  @deepEqual structure.joins[0].join.fields, { "id": "item.saleId" }, "child join fields"
