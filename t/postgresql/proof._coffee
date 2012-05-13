module.exports = require("proof") ->
  {Relatable} = require "../../lib/relatable"
  fs = require "fs"
  configuration = JSON.parse fs.readFileSync("#{__dirname}/../../configuration.json", "utf8")
  return context =
    relatable: new Relatable(configuration.databases.postgresql)
    resetManufacturer:  (_) ->
      context.relatable.sql "DELETE FROM Manufacturer WHERE id > 1", _
      context.relatable.sql "UPDATE Manufacturer SET name = 'Acme' WHERE id = 1", _
