#!/usr/bin/env node

require("./proof")(2, function (scanner, deepEqual) {
  var tree = scanner.query("\
    SELECT *,\n\
          (SELECT * FROM b AS d ON c.id = d.id)\n\
      FROM a AS c\n\
    ");
  deepEqual(tree,
    [ { type: 'all', before: '    SELECT ', value: '*' },
      { type: 'subselect', before: ',\n          (', value: '' },
      { type: 'all', before: 'SELECT ', value: '*' },
      { type: 'from', before: ' ', value: 'FROM' },
      { alias: 'd', name: 'b', schema: 'public', type: 'table', before: ' ', value: 'b AS d' },
      { type: 'left', index: 0, value: 'c.id', table: 'c', column: 'id', before: ' ON ' },
      { type: 'right', index: 0, value: 'd.id', table: 'd', column: 'id', before: ' = ' },
      { type: 'rest', before: '', value: '' },
      { type: 'collection', before: ')', value: '' },
      { type: 'from', before: '\n      ', value: 'FROM' },
      { alias: 'c', name: 'a', schema: 'public', type: 'table', before: ' ', value: 'a AS c' },
      { type: 'stuff', before: '\n    ', value: '' },
      { type: 'rest', before: '', value: '' } ], 'scan sub select');
  tree = scanner.query("\
        SELECT *, \
              (SELECT products.* \
                 FROM sale_item AS item ON item.sale_id = sale.id \
                 JOIN product AS products ON products.manufacturer_id = item.manufacturer_id \
                                         AND products.manufacturer_code = item.manufacturer_code \
               )\
          FROM sale \
    ");
  deepEqual(tree,
    [ { type: 'all', before: '        SELECT ', value: '*' },
      { type: 'subselect', before: ',               (', value: '' },
      { type: 'tableAll',
        table: 'products',
        before: 'SELECT ',
        value: 'products.*' },
      { type: 'from', before: '                  ', value: 'FROM' },
      { alias: 'item',
        name: 'sale_item',
        schema: 'public',
        type: 'table',
        before: ' ',
        value: 'sale_item AS item' },
      { type: 'left',
        index: 0,
        value: 'item.sale_id',
        table: 'item',
        column: 'sale_id',
        before: ' ON ' },
      { type: 'right',
        index: 0,
        value: 'sale.id',
        table: 'sale',
        column: 'id',
        before: ' = ' },
      { alias: 'products',
        name: 'product',
        schema: 'public',
        type: 'table',
        before: '                  JOIN ',
        value: 'product AS products' },
      { type: 'left',
        index: 2,
        value: 'products.manufacturer_id',
        table: 'products',
        column: 'manufacturer_id',
        before: ' ON ' },
      { type: 'right',
        index: 2,
        value: 'item.manufacturer_id',
        table: 'item',
        column: 'manufacturer_id',
        before: ' = ' },
      { type: 'left',
        index: 3,
        value: 'products.manufacturer_code',
        table: 'products',
        column: 'manufacturer_code',
        before: '                                          AND ' },
      { type: 'right',
        index: 3,
        value: 'item.manufacturer_code',
        table: 'item',
        column: 'manufacturer_code',
        before: ' = ' },
      { type: 'rest', before: '                ', value: '' },
      { type: 'collection', before: ')', value: '' },
      { type: 'from', before: '          ', value: 'FROM' },
      { value: 'sale',
        alias: 'sale',
        name: 'sale',
        schema: 'public',
        type: 'table',
        before: ' ' },
      { type: 'stuff', before: '     ', value: '' },
      { type: 'rest', before: '', value: '' } ], 'sub-select with join');
});
