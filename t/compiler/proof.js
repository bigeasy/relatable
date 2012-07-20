module.exports = require("proof")(function (async) {
  var Client = require("mysql").Client
    , fs = require("fs")
    , compiler = require("../../lib/compiler")
    ;
  
  var object =  { id: 1, rgt: 1, lft: 2, permalink: "home" }, mysql, schema = {}, client;

  async(function () {
    fs.readFile(__dirname + "/../../configuration.json", "utf8", async());
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
    ", [ mysql.name ], async());
  }, function  (results) {
    results.forEach(function (column) {
      (schema[column.TABLE_NAME] || (schema[column.TABLE_NAME] = [])).push(column.COLUMN_NAME);
    });

    client.destroy();
  
    return { schema: schema, compiler: compiler, object: object };
  });
});
