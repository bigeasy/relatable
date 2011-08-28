{TwerpTest} = require "twerp"
scanner   = require "../lib/scanner"

class exports.ScannerTest extends TwerpTest
  'test: scan a minimal select statement': (done) ->
    tree = scanner.scan("SELECT * FROM a")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: '*' },
      { before: ' FROM ', value: 'a', type: 'table', name: 'a' },
      { before: '', type: 'rest' } ]
    done 1

  'test: scan a minimal select statement with where clause': (done) ->
    tree = scanner.scan("SELECT * FROM a WHERE id = ?")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: '*' },
      { before: ' FROM ', value: 'a', type: 'table', name: 'a' },
      { before: 'WHERE id = ?', type: 'rest' } ]
    done 1

  'test: scan table all': (done) ->
    tree = scanner.scan("SELECT a.* FROM a")
    @deepEqual tree, [
      { before: 'SELECT ', value: 'a.*', type: 'tableAll', table: 'a' },
      { before: 'SELECT FROM ', value: 'a', type: 'table', name: 'a' },
      { before: '', type: 'rest' } ]
    done 1

  'test: scan spaced table all': (done) ->
    tree = scanner.scan("SELECT a .\n* FROM a")
    @deepEqual tree, [
      { before: 'SELECT ', value: 'a .\n*', type: 'tableAll', table: 'a' },
      { before: 'SELECT FROM ', value: 'a', type: 'table', name: 'a' },
      { before: '', type: 'rest' } ]
    done 1

  'test: scan join': (done) ->
    tree = scanner.scan("SELECT * FROM a JOIN b ON a.id = b.a_id")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: '*' },
      { value: 'a', name: 'a', type: 'table', before: ' FROM ' },
      { type: 'left', index: 1, value: 'a.id', before: 'JOIN ON ' },
      { type: 'right', index: 1, value: 'b.a_id', before: ' = ' },
      { before: '', type: 'rest' } ]
    done 1
