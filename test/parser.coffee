{TwerpTest} = require "twerp"
{parser}    = require "parser"

class exports.ParserTest extends TwerpTest
  'test: parse a minimal select statement': (done) ->
    tree = parser.parse("SELECT * FROM a")
    @deepEqual tree,
    { "select":
      { "columns": [ "*" ]
      }
    , "joins":
      [
        { "datasource":
          { "type": "table"
          , "name": "a"
          }
        }
      ]
    , "rest": ""
    }
    done 1

  'test: parse a minimal select statement with where clause': (done) ->
    tree = parser.parse("SELECT * FROM a WHERE id = ?")
    @deepEqual tree,
    { "select":
      { "columns": [ "*" ]
      }
    , "joins":
      [
        { "datasource":
          { "type": "table"
          , "name": "a"
          }
        }
      ]
    , "rest": " WHERE id = ?"
    }
    done 1

  'test: parse table all': (done) ->
    tree = parser.parse("SELECT a.* FROM a")
    @deepEqual tree,
    { "select":
      { "columns": [ "a.*" ]
      }
    , "joins":
      [
        { "datasource":
          { "type": "table"
          , "name": "a"
          }
        }
      ]
    , "rest": ""
    }
    done 1

  'test: parse spaced table all': (done) ->
    tree = parser.parse("SELECT a .\n* FROM a")
    @deepEqual tree,
    { "select":
      { "columns": [ "a.*" ]
      }
    , "joins":
      [
        { "datasource":
          { "type": "table"
          , "name": "a"
          }
        }
      ]
    , "rest": ""
    }
    done 1

  'test: parse join': (done) ->
    tree = parser.parse("SELECT * FROM a JOIN b ON a.id = b.a_id")
    @deepEqual tree,
    { "select":
      { "columns": [ "*" ]
      }
    , "joins":
      [
        { "datasource":
          { "type": "table"
          , "name": "a"
          }
        }
      ,
        { "datasource":
          { "type": "table"
          , "name": "b"
          }
        , "conditions":
          { "left": "a.id"
          , "right":"b.a_id"
          }
        }
      ]
    , "rest": ""
    }
    done 1
