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

  'test: one to many': (done) ->
    reflector (schema) =>
      compiler.compile """
        SELECT * FROM  Manufacturer AS manufacturer
        SELECT *
          FROM Product AS products ON products.manufacturerId = manufacturer.id
      """, schema, (structure) =>
        expected = """
          SELECT manufacturer.id AS manufacturer__id,
                 manufacturer.name AS manufacturer__name
            FROM Manufacturer AS manufacturer
        """.trim().replace(/\s+/g, ' ')
        length = 2000
        @equal expected.substring(0, length), structure.sql.trim().replace(/\s+/g, ' ').substring(0, length)
        @equal "manufacturer", structure.pivot
        @deepEqual {}, structure.parents
        expected = """
          SELECT products.id AS products__id,
                 products.manufacturerId AS products__manufacturerId,
                 products.manufacturerCode AS products__manufacturerCode,
                 products.name AS products__name
            FROM relatable_temporary_N AS manufacturer
            JOIN Product AS products ON products.manufacturerId = manufacturer.manufacturer__id
        """.trim().replace(/\s+/g, ' ')
        length = 330
        @equal expected.substring(0, length), structure.joins[0].sql.trim().replace(/relatable_temporary_\d+/, "relatable_temporary_N").replace(/\s+/g, ' ').substring(0, length)
        @equal "products", structure.joins[0].pivot
        @deepEqual {
          table: "manufacturer",
          fields: { id: "manufacturerId" }
        }, structure.joins[0].join
        done 4
