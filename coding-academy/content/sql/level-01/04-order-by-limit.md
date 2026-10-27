---
id: sql-1-4-order-by-limit
title: Sorting with ORDER BY and limiting with LIMIT
track: sql
level: 1
order: 4
minutes: 30
summary: Put results in a useful order - ascending, descending, by several columns - and return just the top rows with LIMIT and OFFSET.
objectives:
  - Sort results with ORDER BY, ascending and descending
  - Sort by more than one column
  - Return the first N rows with LIMIT, and skip rows with OFFSET
  - Write "top N" queries and know where NULLs appear when sorting
  - Write clauses in the correct order
prerequisites: [sql-1-3-in-between-like-null]
tags: [order by, asc, desc, sort, limit, offset, top n, pagination]
---

## Simple explanation

Without instructions, a database may return rows in **any** order. To get a reliable order, use `ORDER BY`:

```sql
SELECT name, price
FROM products
ORDER BY price;          -- cheapest first (ascending)
```

Add `DESC` for descending (largest first): `ORDER BY price DESC`.

To get only the first few rows, add `LIMIT`:

```sql
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 3;                 -- the 3 most expensive products
```

The clauses must be written in this order:

```text
SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...
```

## Real-world analogy

`ORDER BY` is the **"sort by" menu** on a shopping site: price low to high, high to low, newest first. `LIMIT` is
**"show me only the first page"**. `OFFSET` is **"go to page 2"**.

## Technical definition

- `ORDER BY expr [ASC | DESC], expr2 [ASC | DESC], ...` - `ASC` (ascending) is the default. Ties on the first
  expression are broken by the second, and so on.
- You can sort by columns not in the SELECT list, by expressions (`ORDER BY price - cost DESC`) and by column
  aliases (`ORDER BY profit`), because ORDER BY is evaluated **after** SELECT.
- Text sorts alphabetically by character codes (capital letters before lower-case in SQLite's default binary
  collation).
- **NULLs** sort **first** in ascending order in SQLite (and MySQL); PostgreSQL puts them last. Use `NULLS
  LAST` (SQLite 3.30+) to control it.
- `LIMIT n` returns at most n rows; `LIMIT n OFFSET m` skips m rows first. SQL Server uses `TOP n` or
  `OFFSET ... FETCH`; PostgreSQL and MySQL support `LIMIT`.
- Without ORDER BY, "the first 3 rows" is not well defined - always combine LIMIT with ORDER BY.

## Step-by-step examples

**Example 1 - alphabetical**

```sql
SELECT first_name, last_name
FROM students
ORDER BY last_name;
```

**Example 2 - newest orders first**

```sql
SELECT id, order_date, status
FROM orders
ORDER BY order_date DESC;
```

**Example 3 - two sort keys**

```sql
SELECT country, city, first_name
FROM customers
ORDER BY country, city;
```

First by country A→Z; within the same country, by city A→Z.

**Example 4 - top 5 most profitable products**

```sql
SELECT name, price - cost AS profit
FROM products
ORDER BY profit DESC
LIMIT 5;
```

**Example 5 - pagination: products 6-10 by price**

```sql
SELECT name, price
FROM products
ORDER BY price
LIMIT 5 OFFSET 5;
```

**Example 6 - filter, then sort, then limit**

```sql
SELECT name, stock
FROM products
WHERE discontinued = 0
ORDER BY stock
LIMIT 3;          -- the 3 active products with the least stock
```

## Common mistakes

- **Wrong clause order**: `ORDER BY` before `WHERE` is a syntax error.
- **`LIMIT` without `ORDER BY`** - you get *some* rows, not the "top" rows.
- **Forgetting `DESC`** when you want the largest values first.
- **Ties**: if two products share the 3rd-highest price, `LIMIT 3` cuts one off arbitrarily. Add a second sort
  key (e.g. `name`) to make the result predictable.
- **Sorting numbers stored as text**: `'100' < '20'` alphabetically. Our datasets store numbers as numbers.

## Practical application

Top-10 lists (best-selling products, biggest customers), "latest first" activity feeds, alphabetical directories
and paging through results ("next page") all use ORDER BY and LIMIT. Ranking with ties is solved properly with
window functions in Level 6.

## Revision notes

- `ORDER BY col` ascending (default `ASC`); `ORDER BY col DESC` descending.
- Several keys: `ORDER BY country, city` - second key breaks ties.
- Sorting by aliases and expressions is allowed.
- `LIMIT n` first n rows; `LIMIT n OFFSET m` skip m first. Always pair with ORDER BY.
- Clause order: SELECT → FROM → WHERE → ORDER BY → LIMIT.
- SQLite sorts NULLs first in ascending order.

```exercise
id: cheapest-first
title: Cheapest first
difficulty: beginner
dataset: shop
instructions: |
  Show `name` and `price` of all products, **cheapest first**. Two products cost exactly the same - put those in
  alphabetical order of `name`.
starter: |
  SELECT name, price
  FROM products;
hints:
  - "`ORDER BY price` sorts ascending by default."
  - "Add a second sort column after a comma for ties: `ORDER BY price, name`."
solution: |
  SELECT name, price
  FROM products
  ORDER BY price, name;
explanation: |
  ORDER BY sorts the result; ascending (smallest first) is the default. The second column only matters when the
  first one ties - here the Seed Starter Kit and the Watering Can both cost 14.37.
check:
  ordered: true
```

```exercise
id: latest-orders
title: The 5 most recent orders
difficulty: beginner
dataset: shop
instructions: |
  Show `id`, `order_date` and `status` of the **5 most recent** orders (newest first). If two orders share a
  date, put the higher `id` first.
starter: |
  SELECT id, order_date, status
  FROM orders
  LIMIT 5;
hints:
  - "Sort by date descending: `ORDER BY order_date DESC`."
  - "Add a second key for ties: `, id DESC`. Then `LIMIT 5`."
solution: |
  SELECT id, order_date, status
  FROM orders
  ORDER BY order_date DESC, id DESC
  LIMIT 5;
explanation: |
  LIMIT only means "top 5" after an ORDER BY. The second sort key makes the result predictable when dates tie.
check:
  ordered: true
```

```exercise
id: students-sorted
title: Class list by city, then name
difficulty: intermediate
dataset: school
instructions: |
  Show `city`, `last_name` and `first_name` of all students, sorted by **city (A→Z)**, then by **last name
  (A→Z)**, then by **first name (A→Z)**.
starter: |
  SELECT city, last_name, first_name
  FROM students
  ORDER BY last_name;
hints:
  - List the sort keys in priority order, separated by commas.
solution: |
  SELECT city, last_name, first_name
  FROM students
  ORDER BY city, last_name, first_name;
explanation: |
  The first key does the main sorting; the next keys only decide the order between rows that are equal on all
  earlier keys.
check:
  ordered: true
```

```exercise
id: second-page
title: Page 2 of the price list
difficulty: challenge
dataset: shop
instructions: |
  A web page shows **5 active products per page**, sorted by price from **highest to lowest** (ties: by `name`
  A→Z). Write the query for **page 2** (products 6-10). Active means `discontinued = 0`. Show `name` and
  `price`.
starter: |
  SELECT name, price
  FROM products
  ORDER BY price DESC
  LIMIT 5;
hints:
  - "Filter first with `WHERE discontinued = 0`."
  - "`ORDER BY price DESC, name` then `LIMIT 5 OFFSET 5` skips the first page."
solution: |
  SELECT name, price
  FROM products
  WHERE discontinued = 0
  ORDER BY price DESC, name
  LIMIT 5 OFFSET 5;
explanation: |
  Page n of size 5 is `LIMIT 5 OFFSET (n - 1) * 5`. The WHERE filter is applied before sorting and paging.
check:
  ordered: true
```

```quiz
- id: q1
  question: What is the default sort direction of ORDER BY?
  options:
    - Ascending (smallest / A first)
    - Descending
    - Random
    - The order rows were inserted
  answer: Ascending (smallest / A first)
  explanation: ASC is the default; write DESC for largest first.
- id: q2
  question: Which clause order is correct?
  options:
    - SELECT, FROM, WHERE, ORDER BY, LIMIT
    - SELECT, WHERE, FROM, LIMIT, ORDER BY
    - FROM, SELECT, ORDER BY, WHERE
    - SELECT, ORDER BY, FROM, WHERE
  answer: SELECT, FROM, WHERE, ORDER BY, LIMIT
  explanation: Clauses must appear in this order.
- id: q3
  question: How do you get the 3 highest scores?
  options:
    - ORDER BY score DESC LIMIT 3
    - ORDER BY score LIMIT 3
    - LIMIT 3 ORDER BY score DESC
    - WHERE score LIMIT 3
  answer: ORDER BY score DESC LIMIT 3
  explanation: Sort descending first, then keep 3 rows.
- id: q4
  question: What does `LIMIT 10 OFFSET 20` return?
  options:
    - Rows 21 to 30 of the sorted result
    - Rows 10 to 20
    - The first 30 rows
    - Rows 20 to 10
  answer: Rows 21 to 30 of the sorted result
  explanation: Skip 20 rows, then return up to 10.
- id: q5
  question: In `ORDER BY country, city`, what does city do?
  options:
    - Sorts rows that have the same country
    - Sorts all rows by city first
    - Nothing
    - Filters cities
  answer: Sorts rows that have the same country
  explanation: Later sort keys break ties in earlier ones.
- id: q6
  question: Why should LIMIT normally be used together with ORDER BY?
  options:
    - Without ORDER BY the database may return any rows, so "the first N" is not meaningful
    - LIMIT does not work alone
    - ORDER BY makes queries faster
    - It is required by SQL syntax
  answer: Without ORDER BY the database may return any rows, so "the first N" is not meaningful
  explanation: Row order is only guaranteed when you specify it.
```
