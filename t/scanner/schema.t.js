#!/usr/bin/env node

require("./proof")(1, function (scanner, deepEqual) {
  tree = scanner.query("\
    SELECT a.*, b.* \
      FROM x.a AS a \
      JOIN x.b AS b ON a.b_id = b.id \
    ");
  deepEqual(tree,
    [ { type: 'tableAll',
        table: 'a',
        before: '    SELECT ',
        value: 'a.*' },
      { type: 'tableAll', table: 'b', before: ', ', value: 'b.*' },
      { type: 'from', before: '       ', value: 'FROM' },
      { schema: 'x',
        alias: 'a',
        name: 'a',
        type: 'table',
        before: ' ',
        value: 'x.a AS a' },
      { schema: 'x',
        alias: 'b',
        name: 'b',
        type: 'table',
        before: '       JOIN ',
        value: 'x.b AS b' },
      { type: 'left',
        index: 1,
        value: 'a.b_id',
        table: 'a',
        column: 'b_id',
        before: ' ON ' },
      { type: 'right',
        index: 1,
        value: 'b.id',
        table: 'b',
        column: 'id',
        before: ' = ' },
      { type: 'stuff', before: '     ', value: '' },
      { type: 'rest', before: '', value: '' } ], 'schema');
});
