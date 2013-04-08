#!/usr/bin/env node

require("./proof")(5, function (compiler, object, deepEqual) {
  var expected, actual;
  expected = {
    type: "insert",
    table: "Section",
    parameters: object,
    where: [],
    literals: {}
  };
  actual = compiler.insert("Section", object);
  deepEqual(actual, expected, "table only");

  expected = {
    type: "insert",
    table: "Section",
    parameters: object,
    where: [ "id" ],
    literals: {}
  };
  actual = compiler.insert("Section(id)", object);
  deepEqual(actual, expected, "with where");

  expected = {
    type: "insert",
    table: "Section",
    parameters: { permalink: "home" },
    where: [ "id" ],
    literals: {}
  };
  actual = compiler.insert("Section(id) permalink", object);
  deepEqual(actual, expected, "specific fields");

  expected = {
    type: "insert",
    table: "Section",
    parameters: {},
    where: [ "id" ],
    literals: { permalink: "'home'" }
  };
  actual = compiler.insert("Section(id) permalink = 'home'", object);
  deepEqual(actual, expected, "literals");

  expected = {
    type: "insert",
    table: "public.Section",
    parameters: {},
    where: [ "id" ],
    literals: { permalink: "'home'" }
  };
  actual = compiler.insert("public.Section(id) permalink = 'home'", object);
  deepEqual(actual, expected, "schema and literals");
});
