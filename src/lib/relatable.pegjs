statment
    = select:select from:from joins:joins remaining:remaining {
        joins.unshift(from)
        return { select: select, joins: joins, rest: remaining.join("") };
    }

select
    = _ SELECT __ columns:select_columns {
        return { columns: columns };
    }

from
    = __ FROM __ datasource:datasource {
        return { datasource: datasource };
    }

datasource
    = table
    / subselect

table
    = name:name {
        return { type: "table", name: name };
    }
    / name:name (__ ("AS" __)? alias:name) {
        return { type: "table", name: name, alias: alias };
    }

subselect
    = subselect:parenthetical { return subselect.join(""); }

parenthetical
    = "(" contents:parenthetical_contents* ")" { return "(" + contents.join("") + ")"; }

parenthetical_contents
    = parenthetical
    / [^)(]+

joins
    = joins:join* { return joins; }

join
    = __ JOIN __ datasource:datasource __ conditions:join_conditions {
        return { datasource: datasource, conditions: conditions };
    }

join_conditions
    = join_on
    / join_using

join_on
    = "ON" first:join_on_condition subsequent:join_on_condition* {
        subsequent.unshift(first)
        return subsequent
    }

join_on_condition
    = __ left:qualifiedName __ "=" __ right:qualifiedName {
        return { left: left, right: right }; 
    }

join_using
    = __ "USING" _ "(" _ first:name subsequent:join_using_subsequent* ")" {
        subsequent.unshift({ left: first, right: first });
        return subsequent;
    }

join_using_subsequent
    = _ "," _ name:name {
        return { left: name, right: name };
    }

field
    = table:name _ "." _ column:name {
        return table + "." + column;
    }
    / name

qualifiedName
    = table:name _ "." _ column:name {
        return table + "." + column;
    }

select_columns
    = first:select_column subsequent:(_ comma _ select_column)* {
        subsequent.unshift(first);
        return subsequent;
      }

select_column
    = all { return "*"; }
    / table_all:table_all { return table_all; }

all
    = star

table_all
    = table:name _ "." _ "*" { return table + ".*" }

remaining
    = .*

name
    = str:[A-Za-z0-9_]+ { return str.join(""); }

SELECT  = select:SeLeCt { return select.join(""); }
SeLeCt  = [Ss][Ee][Ll][Ee][Cc][Tt]

FROM    = from:FrOm { return from.join(""); }
FrOm    = [Ff][Rr][Oo][Mm]

JOIN    = join:JoIn { return join.join(""); }
JoIn    = [Jj][Oo][Ii][Nn]

AND    = and:AnD { return and.join(""); }
AnD    = [Aa][Nn][Dd]

star    = "*"
comma   = ","

_ "padding"
  = str:whitespace* { return str.join("") }

__ "spacing"
  = str:whitespace+ { return str.join("") }

whitespace
    = [ \t\n\r]
