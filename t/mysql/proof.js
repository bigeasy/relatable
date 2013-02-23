module.exports = require("proof")(function () {
  var Relatable = require("../../lib/relatable").Relatable, fs = require("fs");
  var configuration = JSON.parse(fs.readFileSync(__dirname + "/../../configuration.json", "utf8"));
  var context;
  return context = {
    relatable: new Relatable(configuration.databases.mysql),
    resetManufacturer:  function (callback) {
      context.relatable.sql("DELETE FROM Manufacturer WHERE id > 1", function (error) {
        if (error) throw error;
        context.relatable.sql("UPDATE Manufacturer SET name = 'Acme' WHERE id = 1", callback);
      });
    }
  }
});
