// **TODO**: Move up one and include from engine directories, only the
// `Relatable` configuration loading changes.
module.exports = require("proof")(function () {
  var Relatable = require("../../relatable").Relatable, fs = require("fs");
  var configuration = JSON.parse(fs.readFileSync(__dirname + "/../../configuration.json", "utf8"));
  var context;
  return context = {
    relatable: new Relatable(configuration.databases.postgresql),
    resetManufacturer:  function (schema, callback) {
      if (!callback) {
        callback = schema;
        schema = 'public';
      }
      context.relatable.sql("DELETE FROM " + schema + ".Manufacturer WHERE id > 1", function (error) {
        if (error) throw error;
        context.relatable.sql("UPDATE " + schema + ".Manufacturer SET name = 'Acme' WHERE id = 1", callback);
      });
    }
  }
});
