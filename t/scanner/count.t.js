#!/usr/bin/env node

require("./proof")(1, function (scanner, deepEqual) {
  var tree = scanner.query("SELECT count(*) FROM a")
  deepEqual(tree, [
    { type: 'from', before: 'SELECT count(*) ', value: 'FROM' },
    { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
    { before: '', type: 'rest', value: '' } ]
  , 'scan a select clause with function');
});
