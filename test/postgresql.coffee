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
        throw error if error
        @deepEqual [
          { id: 1
          , name: 'Acme'
          , products: [{ id:1,  manufacturerId:1, manufacturerCode: "A", name:"Heavy Anvil" }]
          }
        ], results
        done 1

  'test: insert': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    mutator = relatable.mutate()
    mutator.insert "Manufacturer", "id", name: "Yoyodyne"
    mutator.insert "Manufacturer", "id", name: "Omni Consumer Products"
    mutator.execute (error, results) =>
      throw error if error
      @equal results[0].id + 1, results[1].id
      relatable.sql "DELETE FROM manufacturer WHERE id > 1", (error) ->
        throw error if error
        done 1