#!/usr/bin/env _coffee
require("./proof") 8, ({ scanner }) ->
  expected = {
    table: "Section"
    where: []
    columns: []
    literals: {}
  }
  mutation = scanner.mutation "Section", tableOnly: true
  @deepEqual mutation, expected, "table only"

  expected = {
    table: "Section"
    where: [ 'id' ]
    columns: []
    literals: {}
  }
  mutation = scanner.mutation "Section(id)"
  @deepEqual mutation, expected, "key only"

  expected = {
    table: "Section"
    where: [ 'id' ]
    columns: [ 'rgt', 'lft' ]
    literals: {}
  }
  mutation = scanner.mutation "Section(id) rgt, lft"
  @deepEqual mutation, expected, "with columns"

  expected = {
    table: "Section"
    where: [ 'id' ]
    columns: [ "*" ]
    literals: {}
  }
  mutation = scanner.mutation "Section(id) *"
  @deepEqual mutation, expected, "star only"

  expected = {
    table: "Section"
    where: [ 'id' ]
    columns: []
    literals:
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
  }
  mutation = scanner.mutation """
    Section(id)
      updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j')
  """
  @deepEqual mutation, expected, "with literals"

  expected = {
    columns: []
    where: [ 'id' ]
    literals:
      name: '\'Axme\''
    table: "Manufacturer"
  }
  mutation = scanner.mutation """
    Manufacturer(id) name = 'Axme'
  """
  @deepEqual mutation, expected, "with string literal"

  expected = {
    columns: [ 'rgt', 'lft' ]
    where: [ 'id' ]
    literals:
      updatedAt: 'DATE_FORMAT(CURRENT_TIMESTAMP(), \'%D %y %a %d %m %b %j\')'
    table: "Section"
  }
  mutation = scanner.mutation """
    Section(id)
      updatedAt = DATE_FORMAT(CURRENT_TIMESTAMP(), '%D %y %a %d %m %b %j'),
      rgt, lft
  """
  @deepEqual mutation, expected, "with columns and literals"

  @throws /cannot find key specification/, -> scanner.mutation "Section"
