---
id: sql-common-errors
title: Common SQL errors and surprises
category: Reference
order: 3
tags: [sql, errors, null, group by, join, syntax]
---

## no such table: X
The table name is misspelled, or the table does not exist in the database you selected. Check the table list in
the SQL Lab. If you dropped it while experimenting, use *Reset practice database*.

## no such column: X
A column name is misspelled, belongs to a table not in your FROM/JOIN, or - very common - you forgot quotes
around a text value: `WHERE city = London` → write `WHERE city = 'London'`.

## near "X": syntax error
SQLite stopped understanding your query just before the word X. Usual causes: clauses in the wrong order (the
order is `SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT`), a missing or extra comma, a missing bracket
or quote.

## ambiguous column name: id
Two joined tables both have a column with that name. Prefix it with the table name or alias: `o.id`, `c.id`.

## misuse of aggregate function COUNT()
Aggregates cannot be used in WHERE. Use `GROUP BY ... HAVING COUNT(*) > 5`.

## UNIQUE constraint failed
You inserted a value that must be unique (often an `id` or email) but already exists.

## NOT NULL constraint failed
A required column was left empty in an INSERT or set to NULL in an UPDATE.

## FOREIGN KEY constraint failed
A row points to a parent that does not exist (e.g. an order for customer 999), or you deleted a parent that
still has children. (SQLite only checks foreign keys when `PRAGMA foreign_keys = ON`; this app turns it on.)

## CHECK constraint failed
A value broke a rule defined on the table, e.g. a negative price.

## Surprise: `= NULL` returns nothing
Comparisons with NULL are never true. Use `IS NULL` / `IS NOT NULL`.

## Surprise: `WHERE x <> 'a'` hides NULL rows
NULL compared to anything is "unknown", so those rows are dropped. Add `OR x IS NULL` if you need them.

## Surprise: `SELECT 7 / 2` gives 3
Both values are integers, so SQLite does integer division. Write `7.0 / 2` or `CAST(7 AS REAL) / 2`.

## Surprise: `'a' + 'b'` gives 0
In SQLite, `+` is only for numbers. Join text with `||`.

## Surprise: LIMIT returns "random" rows
Without ORDER BY, row order is not guaranteed. Always sort before limiting.

## Surprise: a JOIN returns far more rows than expected
Either the ON condition is missing/wrong (every row matched with every row), or the relationship is one-to-many
and rows are repeated. Check row counts before and after joining.

## Surprise: LEFT JOIN behaves like INNER JOIN
A WHERE condition on the right-hand table removes the NULL rows. Move that condition into the `ON` clause.

## Surprise: GROUP BY result has odd values in a column
You selected a column that is neither grouped nor aggregated. SQLite returns a value from an arbitrary row in
the group. Group by it, aggregate it, or remove it.

## Surprise: text comparisons miss rows
`=` is case-sensitive in SQLite: `'london' <> 'London'`. Compare `LOWER(city) = 'london'`. Also watch for
leading/trailing spaces - `TRIM(city)`.

## The query takes too long and is stopped
A recursive CTE without a stopping condition, or a join with no join condition on large tables. Add a WHERE /
ON condition.

## not authorized
The SQL Lab blocks `ATTACH`, `DETACH`, `VACUUM INTO` and some PRAGMA settings to protect your progress
database. Work within the selected practice database.
