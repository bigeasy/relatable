{TwerpTest} = require "twerp"
scanner   = require "../lib/scanner"

class exports.ScannerTest extends TwerpTest
  'test: scan a minimal select statement': (done) ->
    tree = scanner.scan("SELECT * FROM a")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: 'all' },
      { type: "from", before: " ", value:"FROM" },
      { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
      { before: '', type: 'rest', value: '' } ]
    done 1

  'test: scan a minimal select statement with where clause': (done) ->
    tree = scanner.scan("SELECT * FROM a WHERE id = ?")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: 'all' },
      { type: "from", before: " ", value:"FROM" },
      { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
      { value: '', type: 'rest', before: ' WHERE id = ?' } ]
    done 1

  'test: scan table all': (done) ->
    tree = scanner.scan("SELECT a.* FROM a")
    @deepEqual tree, [
      { before: 'SELECT ', value: 'a.*', type: 'tableAll', table: 'a' },
      { type: "from", before: " ", value:"FROM" },
      { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
      { before: '', type: 'rest', value: '' } ]
    done 1

  'test: scan spaced table all': (done) ->
    tree = scanner.scan("SELECT a .\n* FROM a")
    @deepEqual tree, [
      { before: 'SELECT ', value: 'a .\n*', type: 'tableAll', table: 'a' },
      { type: "from", before: " ", value:"FROM" },
      { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
      { before: '', type: 'rest', value: '' } ]
    done 1

  'test: scan join': (done) ->
    tree = scanner.scan("SELECT * FROM a JOIN b ON a.id = b.a_id")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: 'all' },
      { type: "from", before: " ", value:"FROM" },
      { value: 'a', alias: 'a', name: 'a', type: 'table', before: ' ' },
      { value: 'b', alias: 'b', name: 'b', type: 'table', before: ' JOIN ' },
      { type: 'left', index: 1, value: 'a.id', before: ' ON ', table: 'a', column: 'id' },
      { type: 'right', index: 1, value: 'b.a_id', before: ' = ', table: 'b', column: 'a_id' },
      { before: '', type: 'rest', value: '' } ]
    done 1

  'test: scan a table alias': (done) ->
    tree = scanner.scan("SELECT * FROM Aardvark AS a")
    @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: 'all' },
      { type: "from", before: " ", value:"FROM" },
      { before: ' ', alias: 'a', value: 'Aardvark AS a', type: 'table', name: 'Aardvark' },
      { before: '', type: 'rest', value: '' } ]
    done 1

  'test: scan one to many': (done) ->
    tree = scanner.scan("SELECT * FROM a SELECT * FROM b ON a.id = b.a_id")
    @deepEqual tree, [
      {"type":"all","before":"SELECT ","value":"*"},
      {"type":"from","before":" ","value":"FROM"},
      {"value":"a","alias":"a","name":"a","type":"table","before":" "},
      {"type":"rest","before":" ","value":""},
      {"type":"all","before":"SELECT ","value":"*"},
      {"type":"from","before":" ","value":"FROM"}
      {"value":"b","alias":"b","name":"b","type":"table","before":" "},
      {"type":"left","index":0,"value":"a.id","table":"a","column":"id","before":" ON "},
      {"type":"right","index":0,"value":"b.a_id","table":"b","column":"a_id","before":" = "},
      {"type":"rest","before":"","value":""}
    ]
    done 1

  'test: scan one to many with aliases': (done) ->
    tree = scanner.scan("SELECT * FROM a AS c SELECT * FROM b AS d ON c.id = d.a_id")
    @deepEqual {"type":"all","before":"SELECT ","value":"*"}, tree[0]
    @deepEqual {"type":"from","before":" ","value":"FROM"}, tree[1]
    @deepEqual {"value":"a AS c","alias":"c","name":"a","type":"table","before":" "}, tree[2]
    @deepEqual {"type":"rest","before":" ","value":""}, tree[3]
    @deepEqual {"type":"all","before":"SELECT ","value":"*"}, tree[4]
    @deepEqual {"type":"from","before":" ","value":"FROM"}, tree[5]
    @deepEqual {"value":"b AS d","alias":"d","name":"b","type":"table","before":" "}, tree[6]
    @deepEqual {"type":"left","index":0,"value":"c.id","table":"c","column":"id","before":" ON "}, tree[7]
    @deepEqual {"type":"right","index":0,"value":"d.a_id","table":"d","column":"a_id","before":" = "}, tree[8]
    @deepEqual {"type":"rest","before":"","value":""}, tree[9]
    done 10

  'test: subselect in select': (done) ->
    tree = scanner.scan """
      SELECT *,
             (
               select count(*)
                 from contents
                where (type != 'Article' or published_at is not null) and section_id = s.id
             ) AS section__published_articles
        FROM sections AS section
        LEFT JOIN section_translations AS section_translation ON section_translation.section_id = section.id
       WHERE section.site_id = ? AND section_translation.locale = 'en'
       ORDER
          BY section.lft
    """
    @ok 1
    done 1 

  'test: subselect in where': (done) ->
    tree = scanner.scan """
      SELECT *
        FROM contents AS article
        JOIN content_translations AS article_translation ON article.id = article_translation.content_id
       WHERE article.section_id = ?
         AND article_translation.version = (
                  SELECT MAX(version)
                    FROM content_translations AS st
                   WHERE st.content_id = article_translation.content_id
             )
         AND article.published_at IS NOT NULL
       ORDER
          BY article.published_at DESC
       LIMIT ?
      OFFSET ?
    """
    @ok 1
    done 1
