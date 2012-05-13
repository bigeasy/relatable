#!/usr/bin/env _coffee

require("./proof") 3, ({ relatable, resetManufacturer }, _) ->
  resetManufacturer _
  results = relatable.select "SELECT * FROM product", _
  @deepEqual [
    { id: 1
    , manufacturerId: 1
    , manufacturerCode: 'A'
    , name: 'Heavy Anvil'
    }
  ], results, "select"

  results = relatable.select """
      SELECT * FROM  manufacturer
      SELECT *
        FROM product AS products ON products.manufacturer_id = manufacturer.id
    """, _
  @deepEqual [
    { id: 1
    , name: 'Acme'
    , products: [{ id:1,  manufacturerId:1, manufacturerCode: "A", name:"Heavy Anvil" }]
    }
  ], results, "join"

  results = relatable.select """
      SELECT * FROM sale
      SELECT products.*
        FROM sale_item AS item ON item.sale_id = sale.id
        JOIN product AS products ON products.manufacturer_id = item.manufacturer_id
                                AND products.manufacturer_code = item.manufacturer_code
    """, _
  @deepEqual [ {
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
  } ], results, "join through"
