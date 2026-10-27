---
id: sqlite-vs-other-databases
title: SQLite compared with PostgreSQL, MySQL and SQL Server
category: Reference
order: 6
tags: [sqlite, postgresql, mysql, sql server, dialect, differences, portability]
---

This app teaches SQL using **SQLite**. The core language - SELECT, WHERE, GROUP BY, JOIN, subqueries, CTEs,
window functions - is the same in every major database. The differences below are the ones you are most
likely to meet when you move to another system.

## The big picture

| | SQLite | PostgreSQL | MySQL / MariaDB | Microsoft SQL Server |
|---|---|---|---|---|
| Kind | library, one file | server | server | server |
| Typical use | apps, phones, small tools, learning | web apps, analytics | web apps | companies using Microsoft |
| Data types | flexible ("type affinity") | strict | fairly strict | strict |
| Cost | free | free | free (Oracle owns MySQL) | free Express edition; paid editions |

## Joining text

- SQLite, PostgreSQL, Oracle: `first_name || ' ' || last_name`
- MySQL: `CONCAT(first_name, ' ', last_name)` (`||` means OR unless configured otherwise)
- SQL Server: `first_name + ' ' + last_name` or `CONCAT(...)`

## Limiting rows

- SQLite, PostgreSQL, MySQL: `LIMIT 10 OFFSET 20`
- SQL Server: `SELECT TOP 10 ...` or `ORDER BY ... OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`

## Integer division

`SELECT 7 / 2` gives `3` in SQLite, PostgreSQL and SQL Server, but `3.5000` in MySQL.

## Case sensitivity of text comparisons

- SQLite: `=` is case-sensitive; `LIKE` is case-insensitive for ASCII letters.
- PostgreSQL: both case-sensitive; use `ILIKE` for case-insensitive matching.
- MySQL and SQL Server: usually case-insensitive (depends on the "collation").

## Dates and times

- SQLite has no date type: dates are text (`'2026-10-27'`) and functions are `date()`, `datetime()`,
  `strftime()`, `julianday()`.
- PostgreSQL: `DATE`, `TIMESTAMP` types; `NOW()`, `CURRENT_DATE`, `date_trunc('month', d)`, `EXTRACT(YEAR FROM d)`,
  `d + INTERVAL '7 days'`.
- MySQL: `DATE`, `DATETIME`; `NOW()`, `DATE_FORMAT(d, '%Y-%m')`, `DATE_ADD(d, INTERVAL 7 DAY)`.
- SQL Server: `DATE`, `DATETIME2`; `GETDATE()`, `FORMAT(d, 'yyyy-MM')`, `DATEADD(day, 7, d)`, `DATEDIFF(...)`.

## Auto-numbered IDs

- SQLite: `id INTEGER PRIMARY KEY` (automatically increments)
- PostgreSQL: `id SERIAL PRIMARY KEY` or `id INT GENERATED ALWAYS AS IDENTITY`
- MySQL: `id INT AUTO_INCREMENT PRIMARY KEY`
- SQL Server: `id INT IDENTITY(1,1) PRIMARY KEY`

## Types are enforced

SQLite will happily store the text `'abc'` in an INTEGER column (unless the table is declared `STRICT`). Other
databases reject it. Write your SQLite data as if the types were strict - good habit.

## Joins

`RIGHT JOIN` and `FULL OUTER JOIN` exist in SQLite only from version 3.39 (2022). Everything else supports them
(MySQL has no FULL OUTER JOIN - emulate with `UNION`).

## Foreign keys

SQLite only enforces foreign keys after `PRAGMA foreign_keys = ON;` (this app turns it on). Other databases
always enforce them.

## Changing tables

SQLite's `ALTER TABLE` is limited (add/rename/drop column, rename table). Other databases can also change a
column's type, add constraints, etc. In SQLite you rebuild the table for bigger changes.

## Booleans

SQLite stores booleans as `0`/`1`. PostgreSQL has a real `BOOLEAN` (`TRUE`/`FALSE`). SQL Server uses `BIT`.

## What transfers unchanged

SELECT/FROM/WHERE, AND/OR/NOT, IN, BETWEEN, IS NULL, ORDER BY, GROUP BY/HAVING, COUNT/SUM/AVG/MIN/MAX,
INNER/LEFT JOIN, subqueries, EXISTS, CASE, UNION, CTEs (`WITH`), window functions (`OVER`), INSERT/UPDATE/DELETE,
transactions. That is most of what you learn here.
