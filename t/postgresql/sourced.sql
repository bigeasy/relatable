SELECT *,
  (SELECT *,
        (SELECT *
           FROM sale_item AS item
                          ON products.manufacturer_id = item.manufacturer_id
                         AND products.manufacturer_code = item.manufacturer_code
         )
    FROM product AS products ON products.manufacturer_id = manufacturer.id
    )
FROM manufacturer
WHERE id = $manufacturerId
