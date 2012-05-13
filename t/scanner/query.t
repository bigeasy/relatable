#!/usr/bin/env _coffee

require("./proof") 10, ({ scanner }) ->
  tree = scanner.query("SELECT * FROM a")
  @deepEqual tree, [
    { before: 'SELECT ', value: '*', type: 'all' },
    { type: "from", before: " ", value:"FROM" },
    { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
    { before: '', type: 'rest', value: '' } ]
  , 'scan a minimal select statement'

  tree = scanner.query("SELECT * FROM a WHERE id = ?")
  @deepEqual tree, [
      { before: 'SELECT ', value: '*', type: 'all' },
      { type: "from", before: " ", value:"FROM" },
      { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
      { value: '', type: 'rest', before: ' WHERE id = ?' } ]
  , 'scan a minimal select statement with where clause'

  tree = scanner.query("SELECT a.* FROM a")
  @deepEqual tree, [
    { before: 'SELECT ', value: 'a.*', type: 'tableAll', table: 'a' },
    { type: "from", before: " ", value:"FROM" },
    { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
    { before: '', type: 'rest', value: '' } ]
  , 'scan table all'

  tree = scanner.query("SELECT a .\n* FROM a")
  @deepEqual tree, [
    { before: 'SELECT ', value: 'a .\n*', type: 'tableAll', table: 'a' },
    { type: "from", before: " ", value:"FROM" },
    { before: ' ', alias: 'a', value: 'a', type: 'table', name: 'a' },
    { before: '', type: 'rest', value: '' } ]
  , 'test: scan spaced table all'

  tree = scanner.query("SELECT * FROM a JOIN b ON a.id = b.a_id")
  @deepEqual tree, [
    { before: 'SELECT ', value: '*', type: 'all' },
    { type: "from", before: " ", value:"FROM" },
    { value: 'a', alias: 'a', name: 'a', type: 'table', before: ' ' },
    { value: 'b', alias: 'b', name: 'b', type: 'table', before: ' JOIN ' },
    { type: 'left', index: 1, value: 'a.id', before: ' ON ', table: 'a', column: 'id' },
    { type: 'right', index: 1, value: 'b.a_id', before: ' = ', table: 'b', column: 'a_id' },
    { before: '', type: 'rest', value: '' } ]
  , 'scan join'

  tree = scanner.query("SELECT * FROM Aardvark AS a")
  @deepEqual tree, [
    { before: 'SELECT ', value: '*', type: 'all' },
    { type: "from", before: " ", value:"FROM" },
    { before: ' ', alias: 'a', value: 'Aardvark AS a', type: 'table', name: 'Aardvark' },
    { before: '', type: 'rest', value: '' } ]
  , 'scan a table alias'

  tree = scanner.query("SELECT * FROM a SELECT * FROM b ON a.id = b.a_id")
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
  ], "scan one to many"

  tree = scanner.query("SELECT * FROM a AS c SELECT * FROM b AS d ON c.id = d.a_id")
  @deepEqual tree, [
    {"type":"all","before":"SELECT ","value":"*"},
    {"type":"from","before":" ","value":"FROM"},
    {"value":"a AS c","alias":"c","name":"a","type":"table","before":" "},
    {"type":"rest","before":" ","value":""},
    {"type":"all","before":"SELECT ","value":"*"},
    {"type":"from","before":" ","value":"FROM"},
    {"value":"b AS d","alias":"d","name":"b","type":"table","before":" "},
    {"type":"left","index":0,"value":"c.id","table":"c","column":"id","before":" ON "},
    {"type":"right","index":0,"value":"d.a_id","table":"d","column":"a_id","before":" = "},
    {"type":"rest","before":"","value":""}
  ], 'scan one to many with aliases'

  tree = scanner.query """
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
  @ok 1, 'subselect in select'

  tree = scanner.query """
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
  @ok true, 'subselect in where'
