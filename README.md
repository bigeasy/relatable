# Relatable [![Build Status](https://secure.travis-ci.org/bigeasy/relatable.png?branch=master)](http://travis-ci.org/bigeasy/relatable) [![Coverage Status](https://coveralls.io/repos/bigeasy/relatable/badge.png?branch=master)](https://coveralls.io/r/bigeasy/relatable) [![NPM version](https://badge.fury.io/js/relatable.png)](http://badge.fury.io/js/relatable)

Turns your SQL queries in to JSON trees.

Please join the [pre-alpha
discussion](https://github.com/bigeasy/relatable/issues/10).

## Change Log

Changes for each release.

### Version 0.0.4

 * Specify schema in `FROM` and `JOIN`. #52.
 * Gather test coverage from Travis CI using Istanbul and send to coveralls.io.

### Version 0.0.3

Fri Apr  5 15:01:27 UTC 2013

 * Add `.gitignore`. #51.
 * Implement commit and rollback. #35. #34.
 * Evaluated parameters. #43.
 * Parameters in sub-selects. #48.
 * Source SQL from file. #50. #47.
 * Add Cadence as a dependency.
 * Nested sub-selects. #49.
 * Honor `AND` in sub-select. #46.
 * Implement named parameters indicated by `$`. #42.
 * Implement sub-select in SELECT clause. #32.
 * Tidy.
 * Add license, contribution guide and design diary.
 * Fix `insertIf`. #33.
 * Remove `lib` directory. #29.
 * Move Travis CI configuration to `t` directory. #31.
 * Move `ddl` to `t` directory. #30.

### Version 0.0.2

Fri Mar  1 07:30:38 UTC 2013

 * Initial release.
