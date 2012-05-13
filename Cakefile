{Twinkie}       = require "./vendor/twinkie/lib/twinkie"

twinkie = new Twinkie
twinkie.ignore  "configuration.json", ".proof.out", "lib/*"
twinkie.coffee  "src/lib", "lib"
twinkie.tasks task, "compile", "idl", "docco", "gitignore"
