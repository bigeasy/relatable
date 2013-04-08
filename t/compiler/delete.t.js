#!/usr/bin/env node

require("./proof")(3, function (compiler, object, deepEqual) {
  var expected, actual;

  expected = {
    type: "delete",
    table: "Section",
    where: object
  };
  actual = compiler.delete("Section", object);
  deepEqual(actual, expected, "table only");

  expected = {
    type: "delete",
    table: "Section",
    where: { id: 1 }
  };
  actual = compiler.delete("Section(id)", object);
  deepEqual(actual, expected, "with key");

  expected = {
    type: "delete",
    table: "public.Section",
    where: { id: 1 }
  };
  actual = compiler.delete("public.Section(id)", object);
  deepEqual(actual, expected, "with schema and key");
});
