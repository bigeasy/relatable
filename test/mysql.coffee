{Relatable} = require "relatable"
{TwerpTest} = require "twerp"
fs = require "fs"

configuration = JSON.parse fs.readFileSync("#{__dirname}/../configuration.json", "utf8")

class exports.MySQLTest extends TwerpTest
  resetManufacturer: (relatable, callback) ->
    relatable.sql "DELETE FROM Manufacturer WHERE id > 1", (error) =>
      throw error if error
      relatable.sql "UPDATE Manufacturer SET name = 'Acme' WHERE id = 1", (error) ->
        throw error if error
        callback()

  'test: insert': (done) ->
    relatable = new Relatable(configuration.databases.mysql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      mutator.insert "Manufacturer", "id", name: "Yoyodyne"
      mutator.insert "Manufacturer", "id", name: "Omni Consumer Products"
      mutator.execute (error, results) =>
        throw error if error
        @equal results[0].id + 1, results[1].id
        done 1

  'test: update': (done) ->
    relatable = new Relatable(configuration.databases.mysql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      mutator.update "Manufacturer", "id", name: "Axme", id: 1
      mutator.execute (error, results) =>
        @equal 1, results[0].count
        relatable.select "SELECT * FROM Manufacturer", (error, results) =>
          @equal 1, results.length
          @equal "Axme", results[0].name
          done 3

  'test: update identity': (done) ->
    relatable = new Relatable(configuration.databases.mysql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      relatable.sql "INSERT INTO Manufacturer (name) VALUES('Acme')", (error) =>
        throw error if error
        mutator.update "Manufacturer", { name: "Acme" }, { name: "Axme" }
        mutator.execute (error, results) =>
          @equal 2, results[0].count
          relatable.select "SELECT * FROM Manufacturer", (error, results) =>
            @equal 2, results.length
            @equal "Axme", results[0].name
            @equal "Axme", results[1].name
            done 4

  'test: delete extract': (done) ->
    relatable = new Relatable(configuration.databases.mysql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      relatable.sql "INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", (error) =>
        throw error if error
        mutator.delete "Manufacturer", "name", { name: "Yoyodyne" }
        mutator.execute (error, results) =>
          throw error if error
          @equal 1, results[0].count
          relatable.select "SELECT * FROM Manufacturer", (error, results) =>
            @equal 1, results.length
            @equal "Acme", results[0].name
            done 3

  'test: delete specified': (done) ->
    relatable = new Relatable(configuration.databases.mysql)
    @resetManufacturer relatable, =>
      mutator = relatable.mutate()
      relatable.sql "INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", (error) =>
        throw error if error
        mutator.delete "Manufacturer", { name: "Yoyodyne" }
        mutator.execute (error, results) =>
          throw error if error
          @equal 1, results[0].count
          relatable.select "SELECT * FROM Manufacturer", (error, results) =>
            @equal 1, results.length
            @equal "Acme", results[0].name
            done 3
