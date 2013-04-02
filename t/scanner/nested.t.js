#!/usr/bin/env node

require("./proof")(1, function (scanner, deepEqual) {
  tree = scanner.query("\
      SELECT *, \
        (SELECT *, \
              (SELECT * \
                 FROM sale_item AS item ON products.manufacturer_id = item.manufacturer_id \
                                       AND products.manufacturer_code = item.manufacturer_code \
               ) \
          FROM products ON products.manufacturer_id = manufacturer.id \
          ) \
      FROM manufacturer \
    ");
  deepEqual(tree,
[ { type: 'all', before: '      SELECT ', value: '*' },
  { type: 'subselect', before: ',         (', value: '' },
  { type: 'all', before: 'SELECT ', value: '*' },
  { type: 'subselect', before: ',               (', value: '' },
  { type: 'all', before: 'SELECT ', value: '*' },
  { type: 'from', before: '                  ', value: 'FROM' },
  { alias: 'item',
    name: 'sale_item',
    type: 'table',
    before: ' ',
    value: 'sale_item AS item' },
  { type: 'left',
    index: 0,
    value: 'products.manufacturer_id',
    table: 'products',
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
    value: 'products.manufacturer_code',
    table: 'products',
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
  { type: 'from', before: '           ', value: 'FROM' },
  { value: 'products',
    alias: 'products',
    name: 'products',
    type: 'table',
    before: ' ' },
  { type: 'left',
    index: 0,
    value: 'products.manufacturer_id',
    table: 'products',
    column: 'manufacturer_id',
    before: ' ON ' },
  { type: 'right',
    index: 0,
    value: 'manufacturer.id',
    table: 'manufacturer',
    column: 'id',
    before: ' = ' },
  { type: 'rest', before: '           ', value: '' },
  { type: 'collection', before: ')', value: '' },
  { type: 'from', before: '       ', value: 'FROM' },
  { value: 'manufacturer',
    alias: 'manufacturer',
    name: 'manufacturer',
    type: 'table',
    before: ' ' },
  { type: 'stuff', before: '     ', value: '' },
  { type: 'rest', before: '', value: '' } ], 'nested');
});
