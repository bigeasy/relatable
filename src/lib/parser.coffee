PEG = require "pegjs"
fs = require "fs"

try
  source = fs.readFileSync("#{__dirname}/selectamundo.pegjs", "utf8")
  module.exports.parser = PEG.buildParser(source)
catch e
  console.log e
  process.exit 1
