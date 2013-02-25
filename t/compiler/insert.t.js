#!/usr/bin/env node

require("./proof")(4, function (compiler, object, deepEqual) {
  var expected, actual;
  expected = {
    type: "insert",
    table: "Section",
    parameters: object,
    returning: [],
    literals: {}
  };
  actual = compiler.insert("Section", object);
  deepEqual(actual, expected, "table only");

  expected = {
    type: "insert",
    table: "Section",
    parameters: object,
    returning: [ "id" ],
    literals: {}
  };
  actual = compiler.insert("Section(id)", object);
  deepEqual(actual, expected, "with returning");

  expected = {
    type: "insert",
    table: "Section",
    parameters: { permalink: "home" },
    returning: [ "id" ],
    literals: {}
  };
  actual = compiler.insert("Section(id) permalink", object);
  deepEqual(actual, expected, "specific fields");

  expected = {
    type: "insert",
    table: "Section",
    parameters: {},
    returning: [ "id" ],
    literals: { permalink: "'home'" }
  };
  actual = compiler.insert("Section(id) permalink = 'home'", object);
  deepEqual(actual, expected, "literals");
});
