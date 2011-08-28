{merge} = require("coffee-script").helpers
##### Scanner
# Scans through an SQL statement, finding the parts of interest to the relatable
# rewriter, recording their position in the SQL statement.
exports.scan = (sql) ->
  scanner = new Scanner()
  scanner.scan(sql)

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
        @token merge fields, { value: value.join "", table, column }
        @before = [ space ]

  skipParenthesis: ->
    @before = []
    depth = 1
    while depth
      # Can't find a closing curly brace.
      if @rest.length is 0
        throw new Error @error "unmatched curly brace"

      # Skip over any valid code that is not an open or closed parenthsis,
      # skiping over strings as well, so we don't include any parenthesis that
      # are part of a string literal.
      match = ///
        ^
        (
          (?:
            [^()"']+
            |
            '(?:[^\\']|\\.)+'   # single quoted string
            |
            "(?:[^\\"]|\\.)+"   # double quoted string
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

      # Match either an opening curly brace or a closing curly brace before
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

  scan: (@sql) ->
    # Let's get past SELECT and DISINCT.
    @tokens = []
    @before = []
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
    ///i.exec @sql
    if not match
      throw new Error @error "badness"
    [ before, open, @rest ] = match.slice(1)
    @before.push before
    if open
      @skipParenthesis()

    loop
      switch @rest[0]
        when "*"
          @tokens.push
            before: @before.join ""
            value: "*"
            type: "all"
          match = /^\*(\s*)(,?\s*)([^\u0000]+)/.exec @rest
          [ before, comma, @rest ] = match.slice(1)
          @before = [ before, comma or "" ]
        else
          match = /^([^\s.(]+)(\s*)([^\u0000]+)/.exec @rest
          [ name, space, @rest ] = match.slice(1)
          switch @rest[0]
            when "."
              value = [ name, space ]
              table = name
              match = /^(\.\s*)(\*)(\s*)([^\u0000]*)/.exec @rest
              [ dot, name, space, @rest ] = match.slice(1)
              value.push dot
              value.push name
              @tokens.push
                before: @before.join ""
                value: value.join ""
                type: "tableAll"
                table: table
          
      if @rest[0] isnt ','
        break
      @rest = @rest.substring(@rest)
      
    match = /^(FROM\s+)([^\u0000]*)$/i.exec @rest
    if not match
      throw new Error @error "FROM expected"
    [ from, @rest ] = match.slice(1)
    index = 0
    @before.push from
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
          else if match = /^as\s+/.test @rest
            @before.push name
            @before.push paren
          else
            @token { value: name, alias: name, name, type: "table" }
            @before = [ paren ]
            conditions = []
            if index != 0
              @next /^(ON\s+)([^\u0000]*)$/, "ON expected"
              @qualifiedName { type: "left", index }
              @next /^(=\s*)([^\u0000]*)$/, "= expected"
              @qualifiedName { type: "right", index }

      if not match = /^(join\s+)([^\u0000]*)$/i.exec @rest
        break
      [ before, @rest ] = match.slice(1)
      @before.push before
      index++

    @tokens.push
      before: @rest
      type: "rest"

    @tokens

  token: (token) ->
    token.before = @before.join ""
    @before.length = 0
    @tokens.push token

  error: (message) -> message
