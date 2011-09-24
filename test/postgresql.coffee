{Relatable} = require "relatable"
{TwerpTest} = require "twerp"
fs = require "fs"

configuration = JSON.parse fs.readFileSync("#{__dirname}/../configuration.json", "utf8")

createRelatable = ->
  relatable = new Relatable(configuration.databases.postgresql)

class exports.PostgreSQLTest extends TwerpTest
  'test: simple query': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    relatable.select "SELECT * FROM product", (error, results) =>
      @deepEqual [
        { id: 1
        , manufacturerId: 1
        , manufacturerCode: 'A'
        , name: 'Heavy Anvil'
        }
      ], results
      done 1
  'test: one to many': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    relatable.select """
        SELECT * FROM  manufacturer
        SELECT *
          FROM product AS products ON products.manufacturer_id = manufacturer.id
      """, (error, results) =>
        @deepEqual [
          { id: 1
          , name: 'Acme'
          }
        ], results
        done 1
