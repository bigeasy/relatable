#!/usr/bin/env node

require("./proof")(2, function (scanner, deepEqual) {
  var tree = scanner.query("SELECT * FROM a WHERE a = ${ $.parameter }")
  deepEqual(tree,
    [ { type: 'all', before: 'SELECT ', value: '*' },
      { type: 'from', before: ' ', value: 'FROM' },
      { value: 'a', alias: 'a', name: 'a', type: 'table', before: ' ' },
      { type: 'stuff', before: ' WHERE a = ', value: '' },
      { type: 'evaluated', before: '${', value: ' $.parameter ' },
      { type: 'stuff', before: '', value: '' },
      { type: 'rest', before: '', value: '' } ]
  , 'single parameter');
  var tree = scanner.query("SELECT * FROM a WHERE a = ${ $.parameter || 0 } AND b = ${ other - 1 }")
  deepEqual(tree,
    [ { type: 'all', before: 'SELECT ', value: '*' },
      { type: 'from', before: ' ', value: 'FROM' },
      { value: 'a', alias: 'a', name: 'a', type: 'table', before: ' ' },
      { type: 'stuff', before: ' WHERE a = ', value: '' },
      { type: 'evaluated', before: '${', value: ' $.parameter || 0 ' },
      { type: 'stuff', before: ' AND b = ', value: '' },
      { type: 'evaluated', before: '${', value: ' other - 1 ' },
      { type: 'stuff', before: '', value: '' },
      { type: 'rest', before: '', value: '' } ]
  , 'double parameters');
});
