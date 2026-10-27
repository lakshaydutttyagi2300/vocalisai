---
id: sql-2-1-aggregate-functions
title: Counting and totals - COUNT, SUM, AVG, MIN, MAX
track: sql
level: 2
order: 1
minutes: 35
summary: Summarise many rows into one answer - how many, how much in total, the average, the smallest and the largest - and round the results.
objectives:
  - Use COUNT(*), COUNT(column) and COUNT(DISTINCT column) and explain the differences
  - Calculate totals and averages with SUM and AVG
  - Find extremes with MIN and MAX
  - Combine aggregates with WHERE and round results with ROUND
  - Explain how aggregates treat NULL values
prerequisites: [sql-1-4-order-by-limit]
tags: [aggregate, count, sum, avg, min, max, round, null, summary]
---

## Simple explanation

So far each result row matched a table row. **Aggregate functions** do something different: they squash many
rows into **one summary value**.

| Function | Question it answers | Example |
|---|---|---|
| `COUNT(*)` | How many rows? | `SELECT COUNT(*) FROM orders;` |
| `SUM(col)` | What is the total? | `SELECT SUM(stock) FROM products;` |
| `AVG(col)` | What is the average? | `SELECT AVG(price) FROM products;` |
| `MIN(col)` | What is the smallest? | `SELECT MIN(price) FROM products;` |
| `MAX(col)` | What is the largest? | `SELECT MAX(order_date) FROM orders;` |

You can use several at once, and combine them with `WHERE` (which filters rows *before* summarising):

```sql
SELECT COUNT(*) AS cancelled_orders
FROM orders
WHERE status = 'cancelled';
```

## Real-world analogy

Aggregates are like the **summary line at the bottom of a receipt**: number of items, total price. Instead of
reading every line, you get one number that describes them all. `WHERE` is like saying "only count the fruit on
this receipt".

## Technical definition

- An **aggregate function** takes a set of values (one per row) and returns a single value.
- `COUNT(*)` counts rows. `COUNT(column)` counts rows where that column is **not NULL**.
  `COUNT(DISTINCT column)` counts different non-NULL values.
- `SUM`, `AVG`, `MIN`, `MAX` **ignore NULLs**. If all values are NULL (or there are no rows), they return NULL
  (`COUNT` returns 0).
- `AVG` in SQLite returns a floating-point number. `ROUND(x, n)` rounds to n decimal places (`ROUND(x)` → 0
  decimals, still a float in SQLite).
- `MIN`/`MAX` also work on text (alphabetical) and ISO dates (earliest/latest).
- Without `GROUP BY` (next lesson), an aggregate query returns **exactly one row** - and you cannot mix
  aggregates with plain columns in a meaningful way (SQLite allows it but picks an arbitrary row; other
  databases raise an error).

## Step-by-step examples

**Example 1 - how many customers?** (Shop)

```sql
SELECT COUNT(*) AS customers
FROM customers;
```

**Example 2 - COUNT(*) vs COUNT(column)** (School)

```sql
SELECT COUNT(*) AS students,
       COUNT(email) AS with_email,
       COUNT(*) - COUNT(email) AS without_email
FROM students;
```

`COUNT(email)` skips NULL emails, so the difference tells you how many are missing.

**Example 3 - price statistics**

```sql
SELECT MIN(price) AS cheapest,
       MAX(price) AS most_expensive,
       ROUND(AVG(price), 2) AS average_price
FROM products;
```

**Example 4 - totals with a calculation inside**

```sql
SELECT SUM(quantity * unit_price) AS gross_sales
FROM order_items;
```

The expression is calculated for each row, then summed.

**Example 5 - how many different cities?**

```sql
SELECT COUNT(DISTINCT city) AS cities
FROM customers;
```

**Example 6 - first and last order dates**

```sql
SELECT MIN(order_date) AS first_order, MAX(order_date) AS latest_order
FROM orders;
```

## Common mistakes

- **Using `COUNT(column)` when you mean all rows** - NULLs are skipped, so the number may be smaller.
- **Expecting AVG to treat NULL as 0** - it ignores NULLs. `AVG(score)` is the average of graded scores only.
- **Putting aggregates in WHERE**: `WHERE COUNT(*) > 5` is an error ("misuse of aggregate"). Use `HAVING`
  (next lesson).
- **Mixing aggregates and normal columns** without GROUP BY: `SELECT name, MAX(price) FROM products` - works in
  SQLite by accident (and happens to return the matching name for MAX), but fails in other databases. Use
  `ORDER BY price DESC LIMIT 1` to get the name of the most expensive product.
- **Integer averages in other databases**: PostgreSQL's AVG of integers returns a decimal, but SQL Server's
  returns an integer - another reason to know your database.

## Practical application

Dashboards are built from aggregates: total revenue, number of orders today, average order value, newest
signup. The *sales reporting* and *expense tracking* projects start with exactly these functions.

## Revision notes

- Aggregates turn many rows into one value: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.
- `COUNT(*)` all rows; `COUNT(col)` non-NULL values; `COUNT(DISTINCT col)` different values.
- SUM/AVG/MIN/MAX ignore NULL.
- `WHERE` filters rows *before* aggregating. Aggregates cannot go in WHERE.
- `ROUND(value, 2)` for readable decimals. Use aliases for readable column names.

```exercise
id: count-products
title: How many products?
difficulty: beginner
dataset: shop
instructions: |
  Return one row with one column called **`products`** containing the number of products in the `products`
  table.
starter: |
  SELECT *
  FROM products;
hints:
  - "`COUNT(*)` counts rows."
  - "Name the column with `AS products`."
solution: |
  SELECT COUNT(*) AS products
  FROM products;
explanation: |
  COUNT(*) counts every row in the table and returns a single number.
check:
  columns: true
```

```exercise
id: price-stats
title: Price statistics
difficulty: beginner
dataset: shop
instructions: |
  Return one row with three columns: **`cheapest`** (lowest price), **`most_expensive`** (highest price) and
  **`average`** (average price rounded to 2 decimal places) for all products.
starter: |
  SELECT MIN(price) AS cheapest
  FROM products;
hints:
  - "Add `MAX(price) AS most_expensive`."
  - "`ROUND(AVG(price), 2) AS average`"
solution: |
  SELECT MIN(price) AS cheapest,
         MAX(price) AS most_expensive,
         ROUND(AVG(price), 2) AS average
  FROM products;
explanation: |
  Several aggregates can be calculated in one query. ROUND makes the average readable.
check:
  columns: true
```

```exercise
id: delivered-revenue
title: Total sales value after discounts
difficulty: intermediate
dataset: shop
instructions: |
  Calculate the total sales value of all order items, where value is `quantity * unit_price * (1 - discount)`.
  Round the answer to 2 decimal places and name the column **`revenue`**.
starter: |
  SELECT SUM(quantity * unit_price) AS revenue
  FROM order_items;
hints:
  - The discount is a fraction (0.1 = 10% off), so the paid amount is `unit_price * (1 - discount)`.
  - "`ROUND(SUM(quantity * unit_price * (1 - discount)), 2)`"
solution: |
  SELECT ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS revenue
  FROM order_items;
explanation: |
  The expression is evaluated for every row, summed, then rounded once at the end. Rounding inside the SUM (per
  row) could give a slightly different total.
check:
  columns: true
```

```exercise
id: grading-progress
title: Grading progress
difficulty: challenge
dataset: school
instructions: |
  For the **'2026-spring'** term only, return one row with:

  - **`enrollments`** - number of enrollments in that term
  - **`graded`** - how many have a score (not NULL)
  - **`not_graded`** - how many have no score yet
  - **`average_score`** - average of the graded scores, rounded to 1 decimal place
starter: |
  SELECT COUNT(*) AS enrollments
  FROM enrollments;
hints:
  - "Filter the term first: `WHERE term = '2026-spring'`."
  - "`COUNT(score)` skips NULLs; `COUNT(*) - COUNT(score)` counts the missing ones."
  - "`ROUND(AVG(score), 1)` - AVG already ignores NULLs."
solution: |
  SELECT COUNT(*) AS enrollments,
         COUNT(score) AS graded,
         COUNT(*) - COUNT(score) AS not_graded,
         ROUND(AVG(score), 1) AS average_score
  FROM enrollments
  WHERE term = '2026-spring';
explanation: |
  COUNT(*) counts all rows that passed the WHERE filter; COUNT(score) only non-NULL scores. AVG ignores the NULL
  scores, so it is the average of graded work only.
check:
  columns: true
```

```quiz
- id: q1
  question: What does `COUNT(*)` count?
  options:
    - All rows, including those with NULL values
    - Only rows without any NULL
    - Different values
    - Columns
  answer: All rows, including those with NULL values
  explanation: COUNT(*) counts rows. COUNT(column) skips NULLs in that column.
- id: q2
  question: A column has values 10, NULL, 20. What is AVG of that column?
  type: text
  answer: ["15", "15.0"]
  explanation: AVG ignores NULL, so it averages 10 and 20.
- id: q3
  question: Which query counts how many different countries customers come from?
  options:
    - SELECT COUNT(DISTINCT country) FROM customers;
    - SELECT DISTINCT COUNT(country) FROM customers;
    - SELECT COUNT(country) FROM customers;
    - SELECT SUM(country) FROM customers;
  answer: SELECT COUNT(DISTINCT country) FROM customers;
  explanation: DISTINCT inside COUNT counts each different value once.
- id: q4
  question: Why does `SELECT * FROM orders WHERE COUNT(*) > 5` fail?
  options:
    - Aggregates cannot be used in WHERE
    - COUNT needs a column name
    - The table is empty
    - WHERE must come before FROM
  answer: Aggregates cannot be used in WHERE
  explanation: WHERE filters individual rows before any counting happens. HAVING filters aggregated results.
- id: q5
  question: Without GROUP BY, how many rows does `SELECT SUM(stock), MAX(price) FROM products` return?
  type: text
  answer: ["1", "one"]
  explanation: Aggregates without GROUP BY produce a single summary row.
- id: q6
  question: What does `MAX(order_date)` return when dates are stored as 'YYYY-MM-DD' text?
  options:
    - The latest date
    - The earliest date
    - An error
    - The number of dates
  answer: The latest date
  explanation: ISO dates sort correctly as text, so MAX gives the latest.
```
