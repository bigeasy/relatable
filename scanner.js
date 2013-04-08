var re = {}, __slice = [].slice;

function die () {
  console.log.apply(console, __slice.call(arguments, 0));
  process.exit(1);
}

function say () { console.log.apply(console, __slice.call(arguments, 0)) }

function compileRegularExpressions() {
  var name, $, lines, i, I, source;
  source = require("fs").readFileSync(__filename, "utf8").split(/\n/);
  for (i = 0, I = source.length; i < I; i++, $ = null) {
    for (; !$ && i < I; i++) {
      $ = /re\["([^"]+)"\s*\/\*\s*$/.exec(source[i]);
    }
    if ($) {
      name = $[1], lines = [];
      for (; ! ($ = /^\s*(i?)\*\/\]/.exec(source[i])); i++) {
        lines.push(source[i].replace(/\/\/.*$/, '').trim());
      }
      re[name] = new RegExp(lines.join("").replace(/ /g, ''), $[1] || "");
    }
  }
}

compileRegularExpressions();

function extend (to, from) {
  for (var key in from) to[key] = from[key];
  return to;
}

//#### Scanner
// Scans through an SQL statement, finding the parts of interest to the relatable
// rewriter, recording their position in the SQL statement.
exports.query = function query (sql) {
  var scanner = new Scanner();
  return scanner.query(sql);
}

function Scanner () {
  var rest, before, test, token, value, index, tokens, text;

  function identifier (message) {
    var identifier, $, name, space;
    if (rest[0] != "") {
      $ = /^([^\s.)(,]+)(\s*)([^\u0000]*)/.exec(rest);
      name = $[1], space = $[2], rest = $[3];
      if (rest[0] == "(") {
        if (messsage) {
          throw new Error(error(message));
        } else {
          before.push(name);
          before.push(space);
        }
      } else {
        identifier = [ name, space ]
      }
    }
    return identifier;
  }

  function bump () {
    var value = rest[0];
    rest = rest.substring(1)
    return value;
  }

  function qualifiedName (fields) {
    var $ = identifier("table name expected"), name = $[0], space = $[1], value, table, column;
    if (rest[0] == ".") {
      table = name;
      value = [ name, space, bump() ];
      $ = identifier("column name expected"), column = $[0], space = $[1];
      value.push(column);
      token(extend(fields, { value: value.join(""), table: table, column: column }));
      before = [ space ];
    }
  }

  function parameter () {
    if (rest[0] == '{') evaluated();
    else named();
  }

  function evaluated () {
    token({ type: 'stuff' });
    before.push(bump());
    var depth = 1, source = '';
    while (rest[0] != '}' && ($ = /^(?:[^'"{}]*|'(?:[^\\']|\\.)*'|"(?:[^\\"]|\\.)*")*/.exec(rest))) {
      value.push($[0]);
      source += $[0];
      rest = rest.substring($[0].length);
      if (rest[0] == '}') {
        break;
      }
    }
    bump();
    token({ type: 'evaluation' });
  }

  function named () {
    token({ type: 'stuff' });
    before.push(bump());
    var $ = /^(\w[\w\d]+)([^\u0000]*)$/.exec(rest);
    value.push($[1]);
    rest = $[2];
    token({ type: 'parameter' });
  }

  function sql (stop, consume) {
    var sql = []
      , stop = String(stop).replace(/\/(.*)\//, "$1")
      , looping = true
      , $, chunk, terminal
      ;
    while (looping) {
      $ = advance("cannot find SQL termination", "(.*?)((?:\\(|'|" + stop + "))")
        , chunk = $[0], terminal = $[1];
      switch (terminal) {
      case "'":
        sql.push(chunk);
        sql.push(terminal);
        // rest of single quoted string
        sql.push(advance("cannot read SQL string", /((?:[^']|'')+')/).shift());
        break;
      case "(":
        sql.push(chunk);
        sql.push(terminal);
        var depth = 1;
        while (depth) {
          $ = advance("unclosed parenthesis", re["parend" /*
            (
              (?:
                [^()']+
                |
                '(?:[^']|'')+'   // single quoted string
              )*
            )
            (
              [)(]
            )
          */]);
          chunk = $[0], terminal = $[1];
          sql.push(chunk);
          sql.push(terminal);
          if (terminal == "(") ++depth;
          else --depth;
        }
        break;
      default:
        sql.push(chunk);
        looping = false;
      }
    }
    sql = sql.join("");
    return [ sql, terminal ];
  }

  function skipParenthesis () {
    var depth = 1, $;
    while (depth) {
      // Can't find a closing parenthesis.
      if (!rest.length) {
        throw new Error(error("unmatched parenthesis"));
      }

      // Skip over any valid code that is not an open or closed parenthesis,
      // skipping over strings as well, so we don't include any parentheses that
      // are part of a string literal.
      $ = re["sql" /*
        ^
        (
          (?:
            [^()']+
            |
            '(?:[^']|'')+'   // single quoted string
          )*
        )
        ([^\u0000]*)
        $
      */].exec(rest);

      before.push($[1]);
      rest = $[2];

      // Can't find a closing parenthesis.
      if (!rest.length)
        throw new Error(error("unmatched parenthesis"));

      // Match either an opening parenthesis or a closing parenthesis before
      // continuing with the loop.
      $ = /^([()])([^\u0000]*)$/.exec(rest);
      var paren = $[1];
      rest = $[2];
      before.push(paren);
      if (paren == "(") depth++;
      else depth--;
    }
  }

  function next (regex, message) {
    var $ = regex.exec(rest);
    if (!$) {
      if (message) throw new Error(error(message));
      else return false;
    }
    before.push($[1]);
    rest = $[2];
    return true;
  }

  function query ($) {
    tokens = [];
    before = [];
    value = [];
    return _query(text = $);
  }

  function and (index) {
    if (next(/^(AND\s+)([^\u0000]*)$/)) {
      qualifiedName({ type: "left", index: index });
      next(/^(=\s*)([^\u0000]*)$/, "= expected");
      qualifiedName({ type: "right", index: index });
      return true;
    } else {
      return false;
    }
  }

  function _query ($, subselect) {
    rest = $;
    // Let's get past SELECT and DISTINCT.
    $ = re["select" /*
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
    i*/].exec(rest);

    // We want to skip DISTINCT and the contents of DISTINCT ON(expression), so
    // if we have DISTINCT ON, we skip what's between the parenthesis.
    if (!$) throw new Error(error("badness"));
    before.push($[1]);
    rest = $[3];
    if ($[2]) skipParenthesis();

    // Here we consume our SELECT columns, looking for all, and handling our
    // special case of sub-selects. We get the column part first, the alias if
    // there is any.

    var columnStart = true;
    for (;;) {
      switch (rest[0]) {
      case "*":
        value = [ "*" ]
        // Can I make this one line?
        token({ type: "all" });
        $ = /^\*(\s*)([^\u0000]+)/.exec(rest);
        before = [ $[1] || "" ],  rest = $[2];
        break;
      case "(":
        if (/^\(\s*SELECT/.test(rest)) {
          before.push(bump());
          token({ type: "subselect" });
          _query(rest, true);
          before.push(bump());
          token({ type: "collection" });
          if (!($ = /^(\s*AS\s+\S+\s*)([^\u0000]*)$/i.exec((rest))))
            $ = /^(\s*)([^\u0000]*)$/.exec(rest);
          before.push($[1]);
          rest = $[2];
        } else {
          before.push(bump());
          skipParenthesis();
          if (!($ = /^(\s*AS\s+\S+\s*)([^\u0000]*)$/i.exec((rest))))
            $ = /^(\s*)([^\u0000]*)$/.exec(rest);
          before.push($[1]);
          rest = $[2];
        }
        break;
      default:
        // This is either a qualified column name or a function call.
        $ = /^([^\s.(]+)(\s*)([^\u0000]+)/.exec(rest);
        var name = $[1], space = $[2]
        rest = $[3];
        if (rest[0] == ".") {
          value = [ name, space ];
          var table = name;
          $ = /^(\.\s*)(\*)(\s*)([^\u0000]*)/.exec(rest);
          var dot = $[1], name = $[2], space = $[3];
          rest = $[4];
          value.push(dot);
          value.push(name);
          token({ type: "tableAll", table: table });
          before.push(space);
        } else if (rest[0] = '(') {
          before.push(name, space, bump());
          skipParenthesis();
          if (!($ = /^(\s*AS\s+\S+\s*)([^\u0000]*)$/i.exec((rest)))) {
            $ = /^(\s*)([^\u0000]*)$/.exec(rest);
          }
          before.push($[1]);
          rest = $[2];
        }
      }

      if (rest[0] != ",") break;
      $ = /^(,\s*)([^\u0000]*)/.exec(rest);
      before.push($[1]);
      rest = $[2];
    }

    $ = /^(FROM)(\s+)([^\u0000]*)$/i.exec(rest);
    if (! $) throw new Error(error("FROM expected"));
    value.push($[1]);
    token({ type: "from" });
    before.push($[2]);
    index = 0;
    rest = $[3];
    for (;;) {
      if (rest[0] != "") {
        $ = /^([^(\s]+)(\(|\s*)([^\u0000]*)$/i.exec(rest);
        var name = $[1], paren = $[2], schema;
        rest = $[3];
        if (paren == "(") {
          before.push(name);
          before.push(paren);
          skipParenthesis();
        } else {
          value.push(name);
          $ = name.split(/\./);
          if ($.length == 2) {
            schema = $[0], name = $[1];
          } else {
            schema = 'public';
          }
          // When we want to pull quoted names, we only capture as.
          if ($ = /^(AS\s+)(\S+)(\s*)([^\u0000]*)$/i.exec(rest)) {
            value.push(paren);
            var as = $[1], alias = $[2], after = $[3];
            rest = $[4];
            value.push(as);
            value.push(alias);
            token({ schema: schema, alias: alias, name: name, type: "table" });
            before.push(after);
          } else {
            token({ schema: schema, alias: name, name: name, type: "table" });
            before = [ paren ];
          }
          var conditions = [];
          if (index != 0 || subselect) {
            next(/^(ON\s+)([^\u0000]*)$/, "ON expected");
            qualifiedName({ type: "left", index: index });
            next(/^(=\s*)([^\u0000]*)$/, "= expected");
            qualifiedName({ type: "right", index: index });
            while (and(++index));
          }
        }
      }
      if (! ($ = /^((?:LEFT\s+)?JOIN\s+)([^\u0000]*)$/i.exec(rest))) break;
      before.push($[1]);
      rest = $[2];
      index++;
    }
    if (rest[0] == ')' && subselect) {
      token({ type: 'rest' });
      return;
    }
    for (;;) {
      $ = re["TODO" /*
        ^
        (
          (?:
            [^)('sS${]       // No parens, quotes, esses, dollars, or curlies.
            |
            S(?!ELECT)      // s, but not select
            |
            '(?:[^']|'')*'  // string
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
      i*/].exec(rest);

      before.push($[1]);
      rest = $[2];
      var select = $[3];
      if (select != null) {
        if (select == "(") {
          before.push(bump());
          skipParenthesis();
        } else if (rest[0] == ")") {
          if (subselect) return;
          before.push(bump());
        } else {
          token({ type: "stuff" });
          _query(rest, true);
          break;
        }
      } else if (rest[0] == '{') {
        evaluated();
      } else if (rest[0] == "$") {
        named();
      } else {
        token({ type: "stuff" });
        break;
      }
    }
    token({ type: "rest" });
    return tokens;
  }

  function token (token) {
    token.before || (token.before = before.join(""));
    before.length = 0;

    token.value || (token.value = value.join(""));
    value.length = 0;

    tokens.push(token);
  }

  function error (message) { return message }

  function reset (text) { index = 0, rest = text }

  function advance (message, regex) {
    if (! regex) regex = message;

    var source;
    if (typeof regex == "string")
      source = regex;
    else
      source = String(regex).replace(/\/(.*)\//, "$1");

    regex = new RegExp("^(" + source + ")([^\\u0000]*)$");

    var $;
    if (!($ = regex.exec(rest))) {
      throw new Error(error(message));
    }

    var last = $.length - 1;
    index += $[1].length;
    rest = $[last];

    return $.slice(2);
  }

  function mutation (text, keyed) {
    var $, table, column, literals;
    reset(text);
    var table = advance("cannot find table specification", re["table" /*
      \s*                            // possible white space.
      (\w[\w\d_]*(?:\.\w[\w\d_]*)?)  // capture an schema qualified JavaScript identifier.
      \s*
    */]).shift();
    var columns = [];
    var literals = {};
    $ = /^(\s*)(\(?)/.exec(rest)
    if (keyed && !$[2]) {
      index += $[1].length;
      throw new Error(error("cannot find key specification"));
    }
    $ = advance(null, re["key" /*
      (?: // optional
        \(            // start of identifiers
        (
          \s*
          \w[\w\d_]*  // capture an JavaScript identifier.
          (?:
            \s*
            ,
            \s*
            \w[\w\d_]*  // capture an JavaScript identifier.
          )*
          \s*
        )
        \)
        \s*
      )?
    */]);
    var where = $[0] ? $[0].split(/\s*,\s*/) : [];
    while (rest.length) {
      $ = advance("cannot find column specification", re["column" /*
        (\*|\w[\w\d_]*)
        \s*
        (?:
          ([=,])
          \s*
        )?
      */]);
      var column = $[0], delimiter = $[1];
      switch (delimiter) {
        case ",":
          columns.push(column);
          break;
        case "=":
          literals[column] = sql(/,|\s*$/).shift();
          advance(/\s*/);
          break;
        default:
          if (rest.length)
            throw new Error(error("unexpected characters"));
          columns.push(column);
      }
    }
    return { table: table, columns: columns, literals: literals, where: where };
  }

  this.mutation = mutation;
  this.query = query;
}

exports.mutation = function mutation (sql, keyed) {
  return new Scanner().mutation(sql, keyed);
}
