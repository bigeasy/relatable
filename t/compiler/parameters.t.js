#!/usr/bin/env node

require("./proof")(2, function (compiler, schema, placeholder, equal) {
  var compilation =
    compiler.compile(" \
      SELECT * \
        FROM Manufacturer AS manufacturer \
       WHERE id = $id  \
    ", schema, placeholder);

    equal(compilation.structure.parameters[0]({ id: 1 }), 1, 'parameters');
    equal(compilation.structure.sql.trim().replace(/\s+/g, ' '),
          'SELECT manufacturer.id AS manufacturer__id, \
                  manufacturer.name AS manufacturer__name \
             FROM Manufacturer AS manufacturer \
            WHERE id = ?'.trim().replace(/\s+/g, ' '),
            'sql');
});
