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
reflector = (table, callback) ->
  if schema = SCHEMAS[table]
    callback schema
  else
    schema = {}
    client.connect (error) ->
      throw error if error
      client.query "SHOW COLUMNS FROM #{table}", [], (error, results, fields) ->
        schema.columns = (result.Field for result in results)
        client.query "SHOW INDEXES FROM #{table}", [], (error, results, fields) ->
          schema.indicies = {}
          for index in results
            if not index.Non_unique
              (schema.indicies[index.Key_name] or= []).push index.Column_name
          for key, value of schema.indicies
            value.sort()
          client.destroy()
          SCHEMAS[table] = schema
          callback schema

class exports.CompilerTest extends TwerpTest
  'test: simple query': (done) ->
    compiler.compile "SELECT * FROM Product", reflector, (structure) =>
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
    compiler.compile """
      SELECT *
        FROM Product
        JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id
    """, reflector, (structure) =>
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
