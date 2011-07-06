selectamundo = require "selectamundo"
fs = require "fs"
{Client} = require "mysql"
{TwerpTest} = require "twerp"

configuration = JSON.parse fs.readFileSync("#{__dirname}/../configuration.json", "utf8")

mysql = configuration.databases.mysql
client            = new Client()
client.host       = mysql.hostname
client.user       = mysql.user
client.password   = mysql.password
client.database   = mysql.name

reflector = (table, callback) ->
  client.connect (error) ->
    throw error if error
    client.query "SHOW COLUMNS FROM #{table}", [], (error, results, fields) ->
      client.destroy()
      columns = (result.Field for result in results)
      callback columns


class exports.SelectaMundoTest extends TwerpTest
  'test: simple query': (done) ->
    try
      selectamundo.selector "SELECT * FROM a", reflector, (sql, treeify) =>
        console.log "THERE"
        console.log sql
        @ok 1
        done 1
    catch e
      console.log e.stack
