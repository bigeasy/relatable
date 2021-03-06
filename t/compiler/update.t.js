#!/usr/bin/env node

require("./proof")(6, function (object, compiler, deepEqual) {
  var expected, actual;
  expected = {
    type: "update",
    schema: "public",
    table: "Section",
    where: { id: 1 },
    parameters: { rgt: 1, lft: 2, permalink: "home" },
    literals: {}
  };
  actual = compiler.update("Section(id)", object);
  deepEqual(actual, expected, "key only");

  expected = {
    type: "update",
    schema: "public",
    table: "Section",
    where: { id: 1 },
    parameters: { rgt: 1, lft: 2 },
    literals: {}
  };
  actual = compiler.update("Section(id) rgt, lft", object);
  deepEqual(actual, expected, "with set");

  expected = {
    type: "update",
    schema: "public",
    table: "Section",
    where: { id: 1 },
    parameters: { rgt: 1, lft: 2, permalink: "home" },
    literals: {}
  };
  actual = compiler.update("Section(id) *", object);
  deepEqual(actual, expected, "star only");

  expected = {
    type: "update",
    schema: "public",
    table: "Section",
    where: { id: 1 },
    parameters: { rgt: 1, lft: 2, permalink: "home" },
    literals: {}
  };
  actual = compiler.update("Section(id) rgt, lft, *", object);
  deepEqual(actual, expected, "star and set");

  expected = {
    type: "update",
    schema: "public",
    table: "Section",
    where: { id: 1 },
    parameters: { rgt: 1, lft: 2, permalink: "home" },
    literals: {
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
    }
  };
  actual = compiler.update(" \
    Section(id) *, updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j'), \
  ", object);
  deepEqual(actual, expected, "star and literals");

  expected = {
    type: "update",
    schema: "x",
    table: "Section",
    where: { id: 1 },
    parameters: { rgt: 1, lft: 2, permalink: "home" },
    literals: {
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
    }
  };
  actual = compiler.update(" \
    x.Section(id) *, updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j'), \
  ", object);
  deepEqual(actual, expected, "schema, star and literals");
});
