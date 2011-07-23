{Twinkie}       = require "./vendor/twinkie/lib/twinkie"

twinkie = new Twinkie
twinkie.ignore  "configuration.json"
twinkie.coffee  "src/lib", "lib"
twinkie.peg     "src/lib", "lib"
twinkie.tasks task, "compile", "idl", "docco", "gitignore"
