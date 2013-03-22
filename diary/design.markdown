# Relatable Design

 * Need to load files, relative to current file if possible.
 * Maybe `.sql` is overloaded to become a function (oh, that's bad).
 * Maybe `.sql` is overloaded to load as resource, which is not bad, it simply
 returns a single string which is the SQL, or an object then, that `select`
 knows what to do with.

## Tree Select

Currently, the joins that ought to form trees are specified as subsequent
queries in the same file. I'm using a perversion of SQL, an `on` statement
applied to the table in the from clause, to join against the previous table. As
time goes by, and the parser gets more robust, I can extend this.

I want to make the tree construction nested, which is currently not possible.
Nesting tree construction means making the subsequent selects sub-selects in the
`SELECT` clause.

## Variables

Ultimately, I can see how Relatable becomes like Stencil, canvas draped over a
scaffolding. I'd like to create a directory to serve off the filesystem, giving
people a way to pre and post process the query, but it is mainly a query.

There would be include mechanisms, so you can describe a complicated select
clause, then use it as a view.

## As Service

It really ought to be not that much different from Stencil, pulling in
JavaScript to express complex concepts, perhaps filtering the output, the crux
is an SQL statement, a large select statement. That is what defines the script.
The scaffolding tidies parameters, possibly cleanups up the output.

## SQL Injection

It is difficult to do anything with SQL without someone saying in a tone that is
vewy sewious that you shouldn't do anything like that because SQL injection. I'm
going to have to have a dismissive response to that, that I'm not really
programming for people who can't program.

## Language

The escape character is `$` plus our little `on` sub-select hack and that is the
extent of the language. It doesn't need to be more.

## CUD

Also, it is the case that you don't want to have queries and data entry be two
sides of the same coin. That doesn't mean that the data entry cannot also have a
higher level language, an object mapping language, shudder.
