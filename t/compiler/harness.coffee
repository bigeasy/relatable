{Client} = require "mysql"
fs = require "fs"

context =
  compiler: require "../../lib/compiler"
  object: { id: 1, rgt: 1, lft: 2, permalink: "home" }
  reflector: (callback) ->
    configuration = JSON.parse fs.readFileSync("#{__dirname}/../../configuration.json", "utf8")

    mysql = configuration.databases.mysql
    client            = new Client()
    client.host       = mysql.hostname
    client.user       = mysql.user
    client.password   = mysql.password
    client.database   = mysql.name

    schema = {}
    client.query """
      SELECT columns.*
        FROM information_schema.tables AS tables
        JOIN information_schema.columns AS columns USING (table_schema, table_name)
       WHERE table_type = 'BASE TABLE' AND tables.table_schema = ?
    """, [ mysql.name ], (error, results, fields) =>
      console.log results
      if error
        callback error
      else
        for column in results
          (schema[column.TABLE_NAME] or= []).push(column.COLUMN_NAME)
        client.destroy()
        console.log schema
        callback null, schema
module.exports = require("proof") context
