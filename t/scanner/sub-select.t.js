#!/usr/bin/env node

require("./proof")(1, function (scanner, deepEqual) {
  tree = scanner.query("\
    SELECT *,\n\
          (SELECT * FROM b AS d ON c.id = d.id)\n\
      FROM a AS c\n\
    ");
  deepEqual(tree,
    [ { type: 'all', before: '    SELECT ', value: '*' },
      { type: 'subselect', before: ',\n          (', value: '' },
      { type: 'all', before: 'SELECT ', value: '*' },
      { type: 'from', before: ' ', value: 'FROM' },
      { alias: 'd', name: 'b', type: 'table', before: ' ', value: 'b AS d' },
      { type: 'left', index: 0, value: 'c.id', table: 'c', column: 'id', before: ' ON ' },
      { type: 'right', index: 0, value: 'd.id', table: 'd', column: 'id', before: ' = ' },
      { type: 'rest', before: '', value: '' },
      { type: 'collection', before: ')', value: '' },
      { type: 'from', before: '\n      ', value: 'FROM' },
      { alias: 'c', name: 'a', type: 'table', before: ' ', value: 'a AS c' },
      { type: 'rest', before: '\n    ', value: '' } ], 'scan sub select');
  tree = scanner.query("\
        SELECT *, \
              (SELECT products.* \
                 FROM sale_item AS item ON item.sale_id = sale.id \
                 JOIN product AS products ON products.manufacturer_id = item.manufacturer_id \
                                         AND products.manufacturer_code = item.manufacturer_code \
               )\
          FROM sale \
    ");
  console.log(tree);
});
