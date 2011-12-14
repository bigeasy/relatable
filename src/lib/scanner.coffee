{merge} = require("coffee-script").helpers

##### Scanner
# Scans through an SQL statement, finding the parts of interest to the relatable
# rewriter, recording their position in the SQL statement.
exports.query = (sql) ->
  scanner = new Scanner()
  scanner.query(sql)

class Scanner
  identifier: (message) ->
    switch @rest[0]
      when ""
      else
        match = /^([^\s.(,]+)(\s*)([^\u0000]*)/.exec @rest
        [ name, space, @rest ] = match.slice(1)
        if @rest[0] is "("
          if messsage
            throw new Error @error message
          else
            @before.push name
            @before.push space
        else
          identifier = [ name, space ]
    identifier

  bump: ->
    value = @rest[0]
    @rest = @rest.substring(1)
    value

  qualifiedName: (fields) ->
    [ name, space ] = @identifier "table name expected"
    switch @rest[0]
      when "."
        table = name
        value = [ name, space ]
        value.push @bump()
        [ column, space ] = @identifier "column name expected"
        value.push column
        @token merge fields, { value: value.join(""), table, column }
        @before = [ space ]

  sql: (stop, consume) ->
    sql = []
    stop = "#{stop}".replace /\/(.*)\//, "$1"
    looping = true
    while looping
      [ chunk, terminal ] = @advance """
        cannot find SQL termination
      """, "(.*?)((?:\\(|'|#{stop}))"
      switch terminal
        when "'"
          sql.push chunk
          sql.push terminal
          [ string ] = @advance """
            cannot read SQL string
          """, ///
            ((?:[^']|'')+')   # rest of single quoted string
          ///
          sql.push string
        when "("
          sql.push chunk
          sql.push terminal
          depth = 1
          while depth
            [ chunk, terminal ] = @advance """
              unclosed parenthesis
            """, ///
              (
                (?:
                  [^()']+
                  |
                  '(?:[^']|'')+'   # single quoted string
                )*
              )
              (
                [)(]
              )
            ///
            sql.push chunk
            sql.push terminal
            if terminal is "(" then ++depth else --depth
        else
          sql.push chunk
          looping = false

    sql = sql.join ""
    [ sql, terminal ]
         
  skipParenthesis: ->
    depth = 1
    while depth
      # Can't find a closing parenthisis.
      if @rest.length is 0
        throw new Error @error "unmatched curly brace"

      # Skip over any valid code that is not an open or closed parenthsis,
      # skiping over strings as well, so we don't include any parenthesis that
      # are part of a string literal.
      match = ///
        ^
        (
          (?:
            [^()']+
            |
            '(?:[^']|'')+'   # single quoted string
          )*
        )
        ([^\u0000]*)
        $
      ///.exec @rest

      [ before, @rest ] = match.slice 1
      @before.push before

      # Can't find a closing curly brace.
      if @rest.length is 0
        throw new Error @error "unmatched curly brace"

      # Match either an opening parenthesis or a closing parenthesis before
      # continuing with the loop.
      match = /^([()])([^\u0000]*)$/.exec @rest
      [ paren, @rest ] = match.slice 1
      @before.push paren
      if paren is "("
        depth++
      else
        depth--

  next: (regex, message) ->
    match = regex.exec @rest
    if not match
      throw new Error @error message
    fields = match.slice(1)
    @before.push fields.shift()
    @rest = fields.pop()
    fields

  query: (@text) ->
    @tokens = []
    @before = []
    @value = []
    @_query(@text)

  _query: (@rest, join) ->
    # Let's get past SELECT and DISINCT.
    match = ///
      ^
      (
        \s*
        SELECT
        (?:
          \s+
          (?:
            ALL
            |
            DISTINCT(\s+ON\s*\()
          )
        )?
        \s+
      )
      (
        [^\u0000]*
      )
      $
    ///i.exec @rest
    if not match
      throw new Error @error "badness"
    [ before, open, @rest ] = match.slice(1)
    @before.push before
    if open
      @skipParenthesis()

    loop
      switch @rest[0]
        when "*"
          @value = [ "*" ]
          # Can I make this one line?
          @token
            type: "all"
          match = /^\*(\s*)([^\u0000]+)/.exec @rest
          [ before, @rest ] = match.slice(1)
          @before = [ before or "" ]
        when "("
          @before.push @bump()
          @skipParenthesis()
          if match = /^(\s*AS\s+\S+\s*)([^\u0000]*)$/i.exec @rest
            [ before, @rest ] = match.slice(1)
            @before.push before
        else
          match = /^([^\s.(]+)(\s*)([^\u0000]+)/.exec @rest
          [ name, space, @rest ] = match.slice(1)
          switch @rest[0]
            when "."
              @value = [ name, space ]
              table = name
              match = /^(\.\s*)(\*)(\s*)([^\u0000]*)/.exec @rest
              [ dot, name, space, @rest ] = match.slice(1)
              @value.push dot
              @value.push name
              @token
                type: "tableAll"
                table: table
              @before.push space
          
      if @rest[0] isnt ","
        break
      [ before, @rest ] = /^(,\s*)([^\u0000]*)/.exec(@rest).slice(1)
      @before.push before
      
    match = /^(FROM)(\s+)([^\u0000]*)$/i.exec @rest
    if not match
      throw new Error @error "FROM expected"
    [ from, before, @rest ] = match.slice(1)
    @value.push from
    @token type: "from"
    @before.push before
    index = 0
    loop
      switch @rest[0]
        when ""
        else
          match = /^([^(\s]+)(\(|\s*)([^\u0000]*)$/i.exec @rest
          [ name, paren, @rest ] = match.slice(1)
          if paren is "("
            @before.push name
            @before.push paren
            @skipParenthesis()
          else
            # When we want to pull quoted names, we only capture as.
            if match = /^(AS\s+)(\S+)(\s*)([^\u0000]*)$/i.exec @rest
              @value.push name
              @value.push paren
              [ as, alias, after, @rest ] = match.slice(1)
              @value.push as
              @value.push alias
              @token { alias, name, type: "table" }
              @before.push after
            else
              @token { value: name, alias: name, name, type: "table" }
              @before = [ paren ]
            conditions = []
            if index != 0 or join
              @next /^(ON\s+)([^\u0000]*)$/, "ON expected"
              @qualifiedName { type: "left", index }
              @next /^(=\s*)([^\u0000]*)$/, "= expected"
              @qualifiedName { type: "right", index }

      if not match = /^((?:LEFT\s+)?JOIN\s+)([^\u0000]*)$/i.exec @rest
        break
      [ before, @rest ] = match.slice(1)
      @before.push before
      index++

    loop
      match = ///
        ^
        (
          (?:
            [^('sS]         # any other character
            |
            S(?!ELECT)      # s, but not select
            |
            '(?:[^']|'')*'  # string
          )*
        )
        (
          (
            \(
            |
            SELECT
          )?
          [^\u0000]*
        )
        $
      ///i.exec @rest

      [ before, @rest, select ] = match .slice(1)
      @before.push before

      if select?
        if select is "("
          @before.push @bump()
          @skipParenthesis()
        else
          @token type: "rest"
          @_query(@rest, true)
          break
      else
        @token type: "rest"
        break

    @tokens

  token: (token) ->
    token.before or= @before.join ""
    @before.length = 0

    token.value or= @value.join ""
    @value.length = 0

    @tokens.push token

  error: (message) -> message

  reset: (@rest) -> @index = 0

  advance: (error, regex) ->
    regex = error if not regex

    source = if typeof regex is "string"
        regex
      else
        "#{regex}".replace /\/(.*)\//, "$1"

    regex = new RegExp "^(#{source})([^\\u0000]*)$"

    if not match = regex.exec @rest
      throw Error @error error

    last    = match.length - 1
    @index += match[1].length
    @rest   = match[last]

    match[2...last]

  mutation: (@text, allow) ->
    @reset(@text)
    [ table ] = @advance """
      cannot find table specification
    """, ///
      \s*           # possible white space.
      (\w[\w\d_]*)  # capture an JavaScript identifier.
      \s*
    ///
    columns = []
    literals = {}
    if allow?.tableOnly and @rest.length is 0
      return { table: table, columns, literals, where: [] }
    [ where, assignment ] = @advance """
      cannot find key specification
    """, ///
      \(            # start of identifiers
      (
        \s*
        \w[\w\d_]*  # capture an JavaScript identifier.
        (?:
          \s*
          ,
          \s*
          \w[\w\d_]*  # capture an JavaScript identifier.
        )*
        \s*
      )
      \)
      \s*
    ///
    where = where.split /\s*,\s*/
    while @rest.length
      [ column, delimiter ] = @advance """
        cannot find column specification
      """, ///
        (\*|\w[\w\d_]*)
        \s*
        (?:
          ([=,])
          \s*
        )?
      ///
      switch delimiter
        when ","
          columns.push column
        when "="
          [ sql ] = @sql /,|\s*$/
          literals[column] = sql
          @advance /\s*/
        else
          if @rest.length
            throw new Error @error "unexpected characters"
          columns.push column
    { table, columns, literals, where }

die = (splat...) ->
  console.log.apply null, splat if splat.length
  process.exit 1

exports.mutation = (sql, allow) ->
  scanner = new Scanner()
  scanner.mutation(sql, allow)
