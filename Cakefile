{Twinkie}       = require "../twinkie/lib/twinkie"

twinkie = new Twinkie
twinkie.ignore  "configuration.json"
twinkie.coffee  "src/lib", "lib"
twinkie.copy    "src/lib", "lib", /\.pegjs$/
twinkie.tasks task, "compile", "idl", "docco", "gitignore"
