#!/usr/bin/env node

require("./proof")(5, function (compiler, object, deepEqual) {
  var expected, actual;
  expected = {
    type: "insert",
    schema: "public",
    table: "Section",
    parameters: object,
    where: [],
    literals: {}
  };
  actual = compiler.insert("Section", object);
  deepEqual(actual, expected, "table only");

  expected = {
    type: "insert",
    schema: "public",
    table: "Section",
    parameters: object,
    where: [ "id" ],
    literals: {}
  };
  actual = compiler.insert("Section(id)", object);
  deepEqual(actual, expected, "with where");

  expected = {
    type: "insert",
    schema: "public",
    table: "Section",
    parameters: { permalink: "home" },
    where: [ "id" ],
    literals: {}
  };
  actual = compiler.insert("Section(id) permalink", object);
  deepEqual(actual, expected, "specific fields");

  expected = {
    type: "insert",
    schema: "public",
    table: "Section",
    parameters: {},
    where: [ "id" ],
    literals: { permalink: "'home'" }
  };
  actual = compiler.insert("Section(id) permalink = 'home'", object);
  deepEqual(actual, expected, "literals");

  expected = {
    type: "insert",
    schema: "x",
    table: "Section",
    parameters: {},
    where: [ "id" ],
    literals: { permalink: "'home'" }
  };
  actual = compiler.insert("x.Section(id) permalink = 'home'", object);
  deepEqual(actual, expected, "schema and literals");
});
