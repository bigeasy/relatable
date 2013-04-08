#!/usr/bin/env node

require("./proof")(10, function (scanner, equal, deepEqual) {
  var expected, mutation;
  expected = {
    table: "Section"
  , where: []
  , columns: []
  , literals: {}
  };
  mutation = scanner.mutation("Section");
  deepEqual(mutation, expected, "table only");

  var expected, mutation;
  expected = {
    table: "public.Section"
  , where: []
  , columns: []
  , literals: {}
  };
  mutation = scanner.mutation("public.Section");
  deepEqual(mutation, expected, "schema and table only");

  expected = {
    table: "Section"
  , where: [ 'id' ]
  , columns: []
  , literals: {}
  }
  mutation = scanner.mutation("Section(id)");
  deepEqual(mutation, expected, "key only");

  expected = {
    table: "Section"
  , where: [ 'id' ]
  , columns: [ 'rgt', 'lft' ]
  , literals: {}
  }
  mutation = scanner.mutation("Section(id) rgt, lft");
  deepEqual(mutation, expected, "with key and columns");

  expected = {
    table: "Section"
  , where: []
  , columns: [ 'rgt', 'lft' ]
  , literals: {}
  }
  mutation = scanner.mutation("Section rgt, lft");
  deepEqual(mutation, expected, "with columns");

  expected = {
    table: "Section"
  , where: [ 'id' ]
  , columns: [ "*" ]
  , literals: {}
  }
  mutation = scanner.mutation("Section(id) *");
  deepEqual(mutation, expected, "star only");

  expected = {
    table: "Section"
  , where: [ 'id' ]
  , columns: []
  , literals: {
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
    }
  }
  mutation = scanner.mutation("\n\
    Section(id) \n\
      updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j') \n\
  ");
  deepEqual(mutation, expected, "with literals");

  expected = {
    columns: []
  , where: [ 'id' ]
  , literals: {
      name: '\'Axme\''
    }
  , table: "Manufacturer"
  };
  mutation = scanner.mutation("Manufacturer(id) name = 'Axme'");
  deepEqual(mutation, expected, "with string literal");

  expected = {
    columns: [ 'rgt', 'lft' ]
  , where: [ 'id' ]
  , literals: {
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
    }
  , table: "Section"
  };
  mutation = scanner.mutation("\n\
    Section(id) \n\
      updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j'), \n\
      rgt, lft \n\
  ");
  deepEqual(mutation, expected, "with columns and literals");

  expected = {
    columns: [ 'rgt', 'lft' ]
  , where: [ 'id' ]
  , literals: {
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
    }
  , table: "public.Section"
  };
  mutation = scanner.mutation("\n\
    public.Section(id) \n\
      updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j'), \n\
      rgt, lft \n\
  ");
  deepEqual(mutation, expected, "with schema, columns and literals");

  try {
    scanner.mutation("Section");
  } catch (error) {
    equal(error.message, 'cannot find key specification');
  }
});
