#!/usr/bin/env node

require("./proof")(1, function (scanner, deepEqual) {
  tree = scanner.query("\
        SELECT *, \
              (SELECT * \
                 FROM sale_item AS item ON product.manufacturer_id = item.manufacturer_id \
                                       AND product.manufacturer_code = item.manufacturer_code \
               )\
          FROM product \
    ");
  deepEqual(tree,
      [ { type: 'all', before: '        SELECT ', value: '*' },
        { type: 'subselect', before: ',               (', value: '' },
        { type: 'all', before: 'SELECT ', value: '*' },
        { type: 'from', before: '                  ', value: 'FROM' },
        { alias: 'item',
          name: 'sale_item',
          schema: 'public',
          type: 'table',
          before: ' ',
          value: 'sale_item AS item' },
        { type: 'left',
          index: 0,
          value: 'product.manufacturer_id',
          table: 'product',
          column: 'manufacturer_id',
          before: ' ON ' },
        { type: 'right',
          index: 0,
          value: 'item.manufacturer_id',
          table: 'item',
          column: 'manufacturer_id',
          before: ' = ' },
        { type: 'left',
          index: 1,
          value: 'product.manufacturer_code',
          table: 'product',
          column: 'manufacturer_code',
          before: '                                        AND ' },
        { type: 'right',
          index: 1,
          value: 'item.manufacturer_code',
          table: 'item',
          column: 'manufacturer_code',
          before: ' = ' },
        { type: 'rest', before: '                ', value: '' },
        { type: 'collection', before: ')', value: '' },
        { type: 'from', before: '          ', value: 'FROM' },
        { value: 'product',
          alias: 'product',
          name: 'product',
          schema: 'public',
          type: 'table',
          before: ' ' },
        { type: 'stuff', before: '     ', value: '' },
        { type: 'rest', before: '', value: '' } ], 'from on and');
});
