{Relatable} = require "relatable"
{TwerpTest} = require "twerp"
fs = require "fs"

configuration = JSON.parse fs.readFileSync("#{__dirname}/../configuration.json", "utf8")

createRelatable = ->
  relatable = new Relatable(configuration.databases.postgresql)

class exports.PostgreSQLTest extends TwerpTest
  'test: simple query': (done) ->
    relatable = new Relatable(configuration.databases.postgresql)
    #relatable.select "SELECT * FROM Product", (results, fields) =>
    @ok 1
    done 1
