{Relatable} = require "relatable"
{TwerpTest} = require "twerp"
fs = require "fs"

configuration = JSON.parse fs.readFileSync("#{__dirname}/../configuration.json", "utf8")

class exports.PostgreSQLTest extends TwerpTest
  resetManufacturer: (relatable, callback) ->
    relatable.sql "DELETE FROM manufacturer WHERE id > 1", (error) =>
      throw error if error
      relatable.sql "UPDATE manufacturer SET name = 'Acme' WHERE id = 1", (error) ->
        throw error if error
        callback()

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
    @resetManufacturer relatable, =>
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
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      mutator.insert "Manufacturer", "id", name: "Yoyodyne"
      mutator.insert "Manufacturer", "id", name: "Omni Consumer Products"
      mutator.execute (error, results) =>
        throw error if error
        @equal results[0].id + 1, results[1].id
        done 1

  'test: update': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      mutator.update "Manufacturer", "id", name: "Axme", id: 1
      mutator.execute (error, results) =>
        throw error if error
        @equal 1, results[0].count
        relatable.select "SELECT * FROM manufacturer", (error, results) =>
          @equal 1, results.length
          @equal "Axme", results[0].name
          done 3

  'test: update identity': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      relatable.sql "INSERT INTO manufacturer (name) VALUES('Acme')", (error) =>
        throw error if error
        mutator.update "Manufacturer", { name: "Acme" }, { name: "Axme" }
        mutator.execute (error, results) =>
          @equal 2, results[0].count
          relatable.select "SELECT * FROM manufacturer", (error, results) =>
            @equal 2, results.length
            @equal "Axme", results[0].name
            @equal "Axme", results[1].name
            done 4

  'test: delete extract': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      relatable.sql "INSERT INTO manufacturer (name) VALUES('Yoyodyne')", (error) =>
        throw error if error
        mutator.delete "Manufacturer", "name", { name: "Yoyodyne" }
        mutator.execute (error, results) =>
          throw error if error
          @equal 1, results[0].count
          relatable.select "SELECT * FROM manufacturer", (error, results) =>
            @equal 1, results.length
            @equal "Acme", results[0].name
            done 3

  'test: delete specified': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      relatable.sql "INSERT INTO manufacturer (name) VALUES('Yoyodyne')", (error) =>
        throw error if error
        mutator.delete "Manufacturer", { name: "Yoyodyne" }
        mutator.execute (error, results) =>
          throw error if error
          @equal 1, results[0].count
          relatable.select "SELECT * FROM manufacturer", (error, results) =>
            @equal 1, results.length
            @equal "Acme", results[0].name
            done 3

  'test: cache': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    @resetManufacturer relatable, =>
      relatable = relatable.cache()
      sql = "SELECT * FROM manufacturer"
      relatable.select sql, (error, results) =>
        was = results
        @equal 1, results.length
        @equal "Acme", results[0].name
        relatable.select sql, (error, results) =>
          @ok results is was
          @equal 1, results.length
          @equal "Acme", results[0].name
          done 5

  'test: through join table': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    relatable.select """
        SELECT * FROM sale
        SELECT products.*
          FROM sale_item AS item ON item.sale_id = sale.id
          JOIN product AS products ON products.manufacturer_id = item.manufacturer_id
                                  AND products.manufacturer_code = item.manufacturer_code
      """, (error, results) =>
        @deepEqual [ {
          id: 1,
          customerId: 1,
          products: [
            {
              id: 1,
              manufacturerId: 1,
              manufacturerCode: "A",
              name: "Heavy Anvil",
              item: { saleId: 1 }
            }
          ]
        } ], results
        done 1
