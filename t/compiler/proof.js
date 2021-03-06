module.exports = require("proof")(function (step) {
  var Client = require("mysql").Client
    , fs = require("fs")
    , compiler = require("../../compiler")
    ;

  var object =  { id: 1, rgt: 1, lft: 2, permalink: "home" }, mysql, schema = { public: {} }, client;

  step(function () {
    fs.readFile(__dirname + "/../../configuration.json", "utf8", step());
  }, function (body) {
    var configuration = JSON.parse(body);
    mysql = configuration.databases.mysql

    client            = new Client()
    client.host       = mysql.hostname
    client.user       = mysql.user
    client.password   = mysql.password
    client.database   = mysql.name

    client.query("\
      SELECT columns.* \
        FROM information_schema.tables AS tables \
        JOIN information_schema.columns AS columns USING (table_schema, table_name) \
       WHERE table_type = 'BASE TABLE' AND tables.table_schema = ? \
    ", [ mysql.name ], step());
  }, function  (results) {
    results.forEach(function (column) {
      (schema.public[column.TABLE_NAME.toLowerCase()] || (schema.public[column.TABLE_NAME.toLowerCase()] = { columns: [] })).columns.push(column.COLUMN_NAME);
    });

    client.destroy();

    function placeholder () { return '?' }

    return { schema: schema, compiler: compiler, object: object, placeholder: placeholder };
  });
});
