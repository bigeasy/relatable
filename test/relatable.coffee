relatable = require "relatable"
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

reflector = (table, callback) ->
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
        callback schema


class exports.RelatableTest extends TwerpTest
  'test: simple query': (done) ->
    relatable.selector "SELECT * FROM Product", reflector, (sql, treeify) =>
      expected = """
        SELECT Product.id AS Product__id,
               Product.manufacturerId AS Product__manufacturerId,
               Product.manufacturerCode AS Product__manufacturerCode,
               Product.name AS Product__name
          FROM Product
      """.trim().replace(/\s+/g, ' ')
      @equal expected, sql.trim().replace(/\s+/g, ' ')
      done 1

  'test: simple join': (done) ->
    relatable.selector """
      SELECT *
        FROM Product
        JOIN Manufacturer ON Product.manufacturerId = Manufacturer.id
    """, reflector, (sql, treeify) =>
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
      @equal expected, sql.trim().replace(/\s+/g, ' ')
      done 1
