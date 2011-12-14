return if not require("streamline/module")(module)

{Relatable} = require "relatable"

context =
  relatable: do ->
    fs = require "fs"
    configuration = JSON.parse fs.readFileSync("#{__dirname}/../../configuration.json", "utf8")
    new Relatable(configuration.databases.postgresql)
  resetManufacturer:  (_) ->
    context.relatable.sql "DELETE FROM Manufacturer WHERE id > 1", _
    context.relatable.sql "UPDATE Manufacturer SET name = 'Acme' WHERE id = 1", _

module.exports = require("ace.is.aces.in.my.book") context
