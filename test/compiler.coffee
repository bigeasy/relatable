compiler = require "compiler"
fs = require "fs"
{Client} = require "mysql"
{TwerpTest} = require "twerp"

configuration = JSON.parse fs.readFileSync("#{__dirname}/../configuration.json", "utf8")

mysql = configuration.databases.mysql
client            = new Client()
client.host       = mysql.hostname
client.user       = mysql.user
client.password   = mysql.password
client.database   = mysql.name

SCHEMAS = {}
reflector = (callback) ->
  schema = {}
  client.connect (error) ->
    throw error if error
    client.query """
        SELECT columns.*
          FROM information_schema.tables AS tables
          JOIN information_schema.columns AS columns USING (table_catalog, table_schema, table_name)
         WHERE table_type = 'BASE TABLE' AND  tables.table_schema NOT IN ('pg_catalog', 'information_schema')
      """, (error, results, fields) =>
        for column in results
          (schema[column.TABLE_NAME] or= []).push(column.COLUMN_NAME)
        client.destroy()
        callback schema

class exports.CompilerTest extends TwerpTest
  'test: simple query': (done) ->
    reflector (schema) =>
      compiler.compile "SELECT * FROM Product", schema, (structure) =>
        expected = """
          SELECT Product.id AS Product__id,
                 Product.manufacturerId AS Product__manufacturerId,
                 Product.manufacturerCode AS Product__manufacturerCode,
                 Product.name AS Product__name
            FROM Product
        """.trim().replace(/\s+/g, ' ')
        @equal expected, structure.sql.trim().replace(/\s+/g, ' ')
        @equal "Product", structure.pivot
        @deepEqual {}, structure.parents
        done 2

  'test: simple join': (done) ->
    reflector (schema) =>
      compiler.compile """
        SELECT *
          FROM Product
          JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id
      """, schema, (structure) =>
        expected = """
          SELECT Product.id AS Product__id,
                 Product.manufacturerId AS Product__manufacturerId,
                 Product.manufacturerCode AS Product__manufacturerCode,
                 Product.name AS Product__name,
                 Manufacturer.id AS Product__Manufacturer__id,
                 Manufacturer.name AS Product__Manufacturer__name
            FROM Product
            JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id
        """.trim().replace(/\s+/g, ' ')
        length = 99999999999
        @equal expected.substring(0, length), structure.sql.trim().replace(/\s+/g, ' ').substring(0, length)
        @equal "Product", structure.pivot
        @deepEqual { "Manufacturer": "Product" }, structure.parents
        done 3
