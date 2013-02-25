#!/usr/bin/env node

require("./proof")(2, function (async, relatable, resetManufacturer, deepEqual) {
  var mutator;

  async(function () {

    resetManufacturer(async())

  }, function () {

    relatable.sql("INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", async());

  }, function () {

    mutator = relatable.mutate();
    mutator.delete("Manufacturer(name)", { name: "Yoyodyne", id: 1 });
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());

  }, function (manufacturers) {
    
    var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
    deepEqual(names, [ "Acme" ], "with key");

    resetManufacturer(async());

  }, function () {

    relatable.sql("INSERT INTO Manufacturer (name) VALUES('Yoyodyne')", async()); 

  }, function () {

    mutator = relatable.mutate();
    mutator.delete("Manufacturer", { name: "Yoyodyne" }, async());
    mutator.commit(async());

  }, function () {

    relatable.select("SELECT * FROM manufacturer", async());

  }, function (manufacturers) {
    
    var names = manufacturers.map(function (manufacturer) { return manufacturer.name });
    deepEqual(names, [ "Acme" ], "no key");

  });
});
