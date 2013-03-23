#!/usr/bin/env node

require("./proof")(2, function (scanner, deepEqual) {
  var tree = scanner.query("SELECT * FROM a WHERE a = $parameter")
  deepEqual(tree,
    [ { type: 'all', before: 'SELECT ', value: '*' },
      { type: 'from', before: ' ', value: 'FROM' },
      { value: 'a', alias: 'a', name: 'a', type: 'table', before: ' ' },
      { type: 'rest', before: ' WHERE a = ', value: '' },
      { type: 'parameter', before: '$', value: 'parameter' },
      { type: 'rest', before: '', value: '' } ]
  , 'single parameter');
  var tree = scanner.query("SELECT * FROM a WHERE a = $parameter AND b = $other")
  deepEqual(tree,
    [ { type: 'all', before: 'SELECT ', value: '*' },
      { type: 'from', before: ' ', value: 'FROM' },
      { value: 'a', alias: 'a', name: 'a', type: 'table', before: ' ' },
      { type: 'rest', before: ' WHERE a = ', value: '' },
      { type: 'parameter', before: '$', value: 'parameter' },
      { type: 'rest', before: ' AND b = ', value: '' },
      { type: 'parameter', before: '$', value: 'other' },
      { type: 'rest', before: '', value: '' } ]
  , 'double parameters');
});
