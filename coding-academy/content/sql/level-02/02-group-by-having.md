---
id: sql-2-2-group-by-having
title: GROUP BY and HAVING
track: sql
level: 2
order: 2
minutes: 40
summary: Summaries per group - totals per category, counts per city, averages per course - and filtering groups with HAVING. Plus the classic grouping errors.
objectives:
  - Produce one summary row per group with GROUP BY
  - Group by more than one column
  - Filter groups with HAVING and explain how it differs from WHERE
  - Avoid the common grouping errors (non-grouped columns, aggregates in WHERE)
  - Describe the logical order in which a query's clauses are processed
prerequisites: [sql-2-1-aggregate-functions]
tags: [group by, having, aggregate, summary, per group, where vs having, query order]
---

## Simple explanation

Aggregates on their own give one answer for the whole table. **`GROUP BY`** gives one answer **per group**:

```sql
SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city;
```

The database sorts the rows into piles - one pile per city - and runs `COUNT(*)` on each pile. Result: one row
per city with its number of customers.

**`HAVING`** filters those **groups** (after counting):

```sql
SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
HAVING COUNT(*) >= 5;
```

Only cities with at least 5 customers remain.

- `WHERE` filters **rows** before grouping.
- `HAVING` filters **groups** after aggregating.

## Real-world analogy

Imagine a pile of receipts. `GROUP BY shop` is **sorting them into one pile per shop**. Then you write the total
on a sticky note on each pile (`SUM`). `WHERE` is throwing away receipts *before* sorting ("ignore refunds").
`HAVING` is throwing away *whole piles* afterwards ("only keep shops where I spent over 100").

## Technical definition

- `GROUP BY expr1, expr2, ...` partitions rows into groups that share the same values of those expressions.
  Each group produces **one** output row.
- In the SELECT list, every item must be either **a grouping expression** or **an aggregate**. Selecting another
  plain column is an error in PostgreSQL/SQL Server; SQLite and (older) MySQL allow it but return a value from
  an arbitrary row - a hidden bug.
- `HAVING condition` is evaluated per group and may use aggregates.
- **Logical processing order** (not the writing order):
  1. `FROM` - pick the table(s)
  2. `WHERE` - filter rows
  3. `GROUP BY` - form groups
  4. `HAVING` - filter groups
  5. `SELECT` - compute output columns
  6. `ORDER BY` - sort
  7. `LIMIT` - cut
- NULL values in a grouping column form their **own group**.

## Step-by-step examples

**Example 1 - number of products per category** (Shop)

```sql
SELECT category_id, COUNT(*) AS products
FROM products
GROUP BY category_id;
```

**Example 2 - several aggregates per group**

```sql
SELECT category_id,
       COUNT(*) AS products,
       ROUND(AVG(price), 2) AS avg_price,
       SUM(stock) AS total_stock
FROM products
GROUP BY category_id
ORDER BY avg_price DESC;
```

**Example 3 - orders per status**

```sql
SELECT status, COUNT(*) AS orders
FROM orders
GROUP BY status
ORDER BY orders DESC;
```

**Example 4 - grouping by two columns**

```sql
SELECT country, segment, COUNT(*) AS customers
FROM customers
GROUP BY country, segment
ORDER BY country, segment;
```

One row per *combination* of country and segment.

**Example 5 - WHERE and HAVING together**: busy months of 2025

```sql
SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS orders
FROM orders
WHERE order_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY month
HAVING COUNT(*) >= 20
ORDER BY month;
```

`substr(order_date, 1, 7)` takes the first 7 characters (`'2025-11'`) - the month. WHERE keeps 2025 orders;
GROUP BY makes one group per month; HAVING keeps busy months.

**Example 6 - average score per course** (School)

```sql
SELECT course_id, ROUND(AVG(score), 1) AS avg_score, COUNT(score) AS graded
FROM enrollments
GROUP BY course_id;
```

## Common mistakes

- **Selecting a column that is not grouped**: `SELECT city, first_name, COUNT(*) ... GROUP BY city` - which
  first_name? SQLite silently picks one; other databases refuse. Only select grouped columns and aggregates.
- **Using WHERE for aggregate conditions**: `WHERE COUNT(*) > 5` → error. Use HAVING.
- **Using HAVING for row conditions**: `HAVING status = 'delivered'` works in some cases but is slower and
  confusing - filter rows with WHERE.
- **Forgetting GROUP BY**: `SELECT city, COUNT(*) FROM customers` returns one row, not one per city.
- **Grouping by too much**: `GROUP BY id` makes every row its own group - nothing is summarised.

## Practical application

"Sales per month", "orders per customer", "average salary per department", "top categories by revenue",
"customers with more than 3 orders" - the backbone of reporting and business analysis. Combined with JOINs
(Level 4), GROUP BY answers almost any summary question.

## Revision notes

- `GROUP BY col` → one result row per distinct value (or combination) of the grouping columns.
- SELECT only grouping columns and aggregates.
- `WHERE` filters rows (before); `HAVING` filters groups (after, can use aggregates).
- Writing order: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.
- Processing order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.
- NULLs form their own group.

```exercise
id: customers-per-country
title: Customers per country
difficulty: beginner
dataset: shop
instructions: |
  Show each `country` and the number of customers there, in a column called **`customers`**.
starter: |
  SELECT country, COUNT(*) AS customers
  FROM customers;
hints:
  - The starter returns only one row. Which clause creates one row per country?
  - "Add `GROUP BY country`."
solution: |
  SELECT country, COUNT(*) AS customers
  FROM customers
  GROUP BY country;
explanation: |
  GROUP BY country makes a separate group for each country; COUNT(*) then counts each group's rows.
check:
  ordered: false
  columns: true
```

```exercise
id: status-counts
title: Orders by status
difficulty: beginner
dataset: shop
instructions: |
  Show each order `status` and how many orders have it (column **`orders`**), with the most common status first.
starter: |
  SELECT status
  FROM orders;
hints:
  - "`COUNT(*) AS orders` with `GROUP BY status`."
  - "`ORDER BY orders DESC` sorts by the count."
solution: |
  SELECT status, COUNT(*) AS orders
  FROM orders
  GROUP BY status
  ORDER BY orders DESC;
explanation: |
  Group, count, then sort by the alias of the count. ORDER BY runs after SELECT, so the alias can be used.
check:
  ordered: true
  columns: true
```

```exercise
id: busy-customers
title: Customers with many orders
difficulty: intermediate
dataset: shop
instructions: |
  Find customers who placed **10 or more** orders. Show `customer_id` and the number of orders (column
  **`orders`**), highest first; ties by `customer_id` ascending.
starter: |
  SELECT customer_id, COUNT(*) AS orders
  FROM orders
  GROUP BY customer_id;
hints:
  - Conditions on counts belong in HAVING, after GROUP BY.
  - "`HAVING COUNT(*) >= 10` then `ORDER BY orders DESC, customer_id`."
solution: |
  SELECT customer_id, COUNT(*) AS orders
  FROM orders
  GROUP BY customer_id
  HAVING COUNT(*) >= 10
  ORDER BY orders DESC, customer_id;
explanation: |
  HAVING filters the groups after counting. WHERE could not do this because the count does not exist until the
  groups are formed.
check:
  ordered: true
  columns: true
```

```exercise
id: monthly-2025
title: Monthly delivered orders in 2025
difficulty: challenge
dataset: shop
instructions: |
  For **delivered** orders placed in **2025**, show each month (column **`month`**, formatted like `2025-03`)
  and the number of orders (column **`orders`**). Only include months with **at least 15** such orders. Sort by
  month.

  Tip: `substr(order_date, 1, 7)` gives the `YYYY-MM` part of a date.
starter: |
  SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS orders
  FROM orders
  GROUP BY month;
hints:
  - "Row filters (status and year) go in WHERE: `WHERE status = 'delivered' AND order_date BETWEEN '2025-01-01' AND '2025-12-31'`."
  - "The 'at least 15' condition is about groups: `HAVING COUNT(*) >= 15`."
solution: |
  SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS orders
  FROM orders
  WHERE status = 'delivered'
    AND order_date BETWEEN '2025-01-01' AND '2025-12-31'
  GROUP BY month
  HAVING COUNT(*) >= 15
  ORDER BY month;
explanation: |
  WHERE removes unwanted rows first, GROUP BY forms monthly groups, HAVING removes quiet months, ORDER BY sorts.
  That is the logical processing order in action.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What does GROUP BY do?
  options:
    - Makes one result row per group of rows that share the same value(s)
    - Sorts the result
    - Removes duplicate columns
    - Joins two tables
  answer: Makes one result row per group of rows that share the same value(s)
  explanation: Aggregates are then calculated per group.
- id: q2
  question: Which clause filters groups using an aggregate such as COUNT(*) > 3?
  type: text
  answer: ["HAVING"]
  explanation: HAVING runs after grouping; WHERE runs before and cannot use aggregates.
- id: q3
  question: In which order are these clauses processed?
  options:
    - FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY
    - SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY
    - FROM, GROUP BY, WHERE, SELECT, HAVING, ORDER BY
    - WHERE, FROM, SELECT, GROUP BY, ORDER BY, HAVING
  answer: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY
  explanation: This logical order explains why WHERE cannot use aggregates or SELECT aliases.
- id: q4
  question: What is wrong with `SELECT city, first_name, COUNT(*) FROM customers GROUP BY city`?
  options:
    - first_name is neither grouped nor aggregated, so its value is ambiguous
    - COUNT(*) is not allowed with GROUP BY
    - city must not be in the SELECT list
    - Nothing
  answer: first_name is neither grouped nor aggregated, so its value is ambiguous
  explanation: Each group has many first names. Other databases raise an error; SQLite picks one arbitrarily.
- id: q5
  question: You want only delivered orders, grouped by month. Where does `status = 'delivered'` belong?
  options:
    - WHERE
    - HAVING
    - GROUP BY
    - ORDER BY
  answer: WHERE
  explanation: It is a condition on individual rows, so filter before grouping.
- id: q6
  question: How many rows does `SELECT status, COUNT(*) FROM orders GROUP BY status` return if there are 5 different statuses?
  type: text
  answer: ["5", "five"]
  explanation: One row per group.
```
