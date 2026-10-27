---
id: sql-5-4-ctes-and-set-operations
title: Common table expressions (WITH) and UNION
track: sql
level: 5
order: 4
minutes: 45
summary: Break complex queries into named, readable steps with WITH, and combine or compare result sets with UNION, UNION ALL, INTERSECT and EXCEPT.
objectives:
  - Write a query with one or more CTEs (WITH ... AS)
  - Build multi-step analyses where each step uses the previous one
  - Stack results with UNION and UNION ALL and know the difference
  - Find overlaps and differences with INTERSECT and EXCEPT
prerequisites: [sql-5-3-subqueries-and-exists]
tags: [cte, with, common table expression, readable, steps, union, union all, intersect, except, minus, set operations, combine results]
---

## Simple explanation

A **CTE** (common table expression) gives a subquery a **name** at the top of your query, so the main query
reads like a story:

```sql
WITH order_totals AS (
    SELECT order_id, SUM(quantity * unit_price) AS total
    FROM order_items
    GROUP BY order_id
)
SELECT COUNT(*) AS orders, ROUND(AVG(total), 2) AS average, MAX(total) AS biggest
FROM order_totals;
```

Step 1 (the CTE): one total per order. Step 2 (the main query): summarise those totals. Same result as a
derived table, but much easier to read - especially with several steps.

**UNION** stacks the rows of two queries on top of each other:

```sql
SELECT city FROM customers
UNION
SELECT shipping_city FROM orders;     -- every city, each listed once
```

## Real-world analogy

A CTE is **showing your working** in a maths exam: "Step 1: total per order. Step 2: average of the totals."
UNION is **merging two guest lists**: UNION removes people who appear on both; UNION ALL keeps everyone, even
twice. INTERSECT is "people on both lists"; EXCEPT is "on the first list but not the second".

## Technical definition

- `WITH name AS (query), name2 AS (query using name) SELECT ...` - CTEs exist only for that one statement;
  later CTEs can use earlier ones; a CTE can be used several times in the main query.
- CTEs are supported by SQLite, PostgreSQL, MySQL 8+, SQL Server. `WITH RECURSIVE` (Level 6) lets a CTE refer
  to itself.
- **Set operations** combine queries with the **same number of columns** and compatible types; column names
  come from the first query; `ORDER BY` goes once, at the very end.
  - `UNION` - all rows from both, **duplicates removed**.
  - `UNION ALL` - all rows, duplicates kept (faster; use it when duplicates are impossible or wanted).
  - `INTERSECT` - rows in both. `EXCEPT` - rows in the first but not the second (Oracle calls it `MINUS`).
- A literal column can label where each row came from: `SELECT 'income' AS kind, ... UNION ALL SELECT
  'spending', ...`.

## Step-by-step examples

**Example 1 - two CTEs in a chain** (Expenses)

```sql
WITH monthly AS (
    SELECT strftime('%Y-%m', tx_date) AS month, SUM(amount) AS net
    FROM transactions
    GROUP BY month
),
good_months AS (
    SELECT * FROM monthly WHERE net > 0
)
SELECT COUNT(*) AS months_with_savings, ROUND(AVG(net), 2) AS avg_saved
FROM good_months;
```

**Example 2 - UNION ALL with a label**

```sql
SELECT 'income' AS kind, ROUND(SUM(amount), 2) AS total FROM transactions WHERE amount > 0
UNION ALL
SELECT 'spending', ROUND(-SUM(amount), 2) FROM transactions WHERE amount < 0;
```

**Example 3 - EXCEPT: who stopped ordering?** (Shop)

```sql
SELECT customer_id FROM orders WHERE order_date < '2026-01-01'
EXCEPT
SELECT customer_id FROM orders WHERE order_date >= '2026-01-01';
```

**Example 4 - INTERSECT**

```sql
-- customers who bought both Books (1) and Electronics (2)
SELECT o.customer_id FROM orders o JOIN order_items i ON i.order_id = o.id
JOIN products p ON p.id = i.product_id WHERE p.category_id = 1
INTERSECT
SELECT o.customer_id FROM orders o JOIN order_items i ON i.order_id = o.id
JOIN products p ON p.id = i.product_id WHERE p.category_id = 2;
```

## Common mistakes

- **A comma after the last CTE** or a missing comma between CTEs - syntax errors.
- **Using a CTE in a different statement** - it only exists for the statement it starts.
- **UNION when you meant UNION ALL** - identical rows silently disappear (e.g. two equal amounts).
- **Different numbers of columns** in the combined queries - error.
- **ORDER BY in each part** of a UNION - only one ORDER BY, at the end.
- **Mismatched column meanings** - UNION matches columns by position, not by name.

## Practical application

Analysts write most non-trivial queries as a chain of CTEs: clean the data → aggregate → compare → rank. It's
easier to test each step (run the CTE alone) and to explain to colleagues. Set operations answer "who did X but
not Y", "which items appear in both lists" and combine similar data from several tables (e.g. this year's and
last year's archives) into one report.

## Revision notes

- `WITH a AS (...), b AS (... FROM a ...) SELECT ... FROM b;` - readable steps.
- UNION (no duplicates) vs UNION ALL (keeps duplicates).
- INTERSECT = in both; EXCEPT = in first, not in second.
- Same number of columns; names from the first query; one ORDER BY at the end.

```exercise
id: cte-order-stats
title: Order statistics with a CTE
difficulty: beginner
dataset: shop
instructions: |
  Using a CTE named **order_totals** (one row per `order_id` with its total `quantity * unit_price` as
  **total**), show the number of orders (column **orders**), the average total (column **average**, rounded to
  2 decimals) and the largest total (column **biggest**, rounded to 2 decimals).
starter: |
  WITH order_totals AS (
      -- one row per order here
  )
  SELECT COUNT(*) AS orders
  FROM order_totals;
hints:
  - "Inside the CTE: `SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id`."
  - "In the main query: `COUNT(*) AS orders, ROUND(AVG(total), 2) AS average, ROUND(MAX(total), 2) AS biggest`."
solution: |
  WITH order_totals AS (
      SELECT order_id, SUM(quantity * unit_price) AS total
      FROM order_items
      GROUP BY order_id
  )
  SELECT COUNT(*) AS orders,
         ROUND(AVG(total), 2) AS average,
         ROUND(MAX(total), 2) AS biggest
  FROM order_totals;
explanation: |
  The CTE does the per-order step and gives it a name; the main query summarises it. Each part is simple on its
  own.
check:
  columns: true
  require_text: [WITH]
```

```exercise
id: all-cities
title: Every city with UNION
difficulty: beginner
dataset: shop
instructions: |
  List every city the shop deals with - customers' home `city` **and** orders' `shipping_city` - each city only
  once, in a single column called **city**, sorted alphabetically.
starter: |
  SELECT city FROM customers
  ORDER BY city;
hints:
  - "Add `UNION SELECT shipping_city FROM orders` before the ORDER BY."
  - "The column name comes from the first query, so it is already `city`."
solution: |
  SELECT city FROM customers
  UNION
  SELECT shipping_city FROM orders
  ORDER BY city;
explanation: |
  UNION removes duplicates across both lists, and the single ORDER BY at the end sorts the combined result.
check:
  ordered: true
  columns: true
```

```exercise
id: category-monthly-average
title: Average monthly spending per category
difficulty: intermediate
dataset: expenses
instructions: |
  For each expense category, show its `name` (column **category**), the **average monthly spending** (column
  **avg_month**) and the **highest month** (column **max_month**), both as positive numbers rounded to 2
  decimals. Only count months in which the category had spending. Sort by `avg_month`, highest first.

  Use a CTE **monthly** with one row per category and month.
starter: |
  WITH monthly AS (
      SELECT category_id, strftime('%Y-%m', tx_date) AS month, SUM(amount) AS spent
      FROM transactions
      GROUP BY category_id, month
  )
  SELECT * FROM monthly;
hints:
  - "Spending rows are negative: in the CTE use `-SUM(amount) AS spent` and `WHERE amount < 0`."
  - "Main query: `JOIN categories AS c ON c.id = monthly.category_id`, `GROUP BY c.name`."
  - "`ROUND(AVG(spent), 2) AS avg_month, ROUND(MAX(spent), 2) AS max_month`"
solution: |
  WITH monthly AS (
      SELECT category_id, strftime('%Y-%m', tx_date) AS month, -SUM(amount) AS spent
      FROM transactions
      WHERE amount < 0
      GROUP BY category_id, month
  )
  SELECT c.name AS category,
         ROUND(AVG(m.spent), 2) AS avg_month,
         ROUND(MAX(m.spent), 2) AS max_month
  FROM monthly AS m
  JOIN categories AS c ON c.id = m.category_id
  GROUP BY c.name
  ORDER BY avg_month DESC;
explanation: |
  Averaging per-month totals needs two levels of aggregation: first by category and month (the CTE), then by
  category (the main query). A plain AVG(amount) would give the average transaction instead.
check:
  ordered: true
  columns: true
```

```exercise
id: lapsed-customers
title: Customers who stopped ordering
difficulty: challenge
dataset: shop
instructions: |
  Find customers who placed orders **in 2025** but **none in 2026**. Show their `id`, `first_name`, `last_name`
  and `country`, sorted by `id`. Use **EXCEPT** inside a CTE called **lapsed** to find their ids.
starter: |
  WITH lapsed AS (
      SELECT customer_id FROM orders WHERE order_date < '2026-01-01'
  )
  SELECT c.id, c.first_name, c.last_name, c.country
  FROM customers AS c
  WHERE c.id IN (SELECT customer_id FROM lapsed)
  ORDER BY c.id;
hints:
  - "The starter finds everyone who ordered in 2025. Remove those who also ordered in 2026."
  - "Add `EXCEPT SELECT customer_id FROM orders WHERE order_date >= '2026-01-01'` inside the CTE."
solution: |
  WITH lapsed AS (
      SELECT customer_id FROM orders WHERE order_date < '2026-01-01'
      EXCEPT
      SELECT customer_id FROM orders WHERE order_date >= '2026-01-01'
  )
  SELECT c.id, c.first_name, c.last_name, c.country
  FROM customers AS c
  WHERE c.id IN (SELECT customer_id FROM lapsed)
  ORDER BY c.id;
explanation: |
  EXCEPT keeps ids from the first list that are not in the second. These "lapsed" customers are exactly who a
  marketing team would contact with a "we miss you" offer.
check:
  ordered: true
  require_text: [EXCEPT]
```

```quiz
- id: q1
  question: What is the main benefit of a CTE (WITH ... AS)?
  options:
    - It splits a complex query into named, readable steps
    - It permanently saves a table
    - It makes every query faster
    - It is required for joins
  answer: It splits a complex query into named, readable steps
  explanation: A CTE exists only for the statement that defines it.
- id: q2
  question: What is the difference between UNION and UNION ALL?
  options:
    - UNION removes duplicate rows; UNION ALL keeps them
    - UNION ALL removes duplicates; UNION keeps them
    - UNION joins columns side by side
    - There is no difference
  answer: UNION removes duplicate rows; UNION ALL keeps them
  explanation: Use UNION ALL when duplicates are wanted or impossible - it's also faster.
- id: q3
  question: Which operator returns rows that appear in the first query but not in the second?
  options:
    - EXCEPT
    - INTERSECT
    - UNION
    - JOIN
  answer: EXCEPT
  explanation: Oracle calls it MINUS.
- id: q4
  question: What is required for two queries combined with UNION?
  options:
    - The same number of columns, with compatible types
    - The same table
    - The same column names
    - An ORDER BY in each query
  answer: The same number of columns, with compatible types
  explanation: Columns are matched by position; names come from the first query.
- id: q5
  question: Where does ORDER BY go in a UNION query?
  options:
    - Once, at the very end
    - In every part
    - Only in the first part
    - ORDER BY isn't allowed with UNION
  answer: Once, at the very end
  explanation: It sorts the combined result.
- id: q6
  question: Can a later CTE use an earlier one in the same WITH clause?
  options:
    - Yes - e.g. WITH a AS (...), b AS (SELECT ... FROM a)
    - No, CTEs are independent
    - Only with UNION
    - Only in PostgreSQL
  answer: Yes - e.g. WITH a AS (...), b AS (SELECT ... FROM a)
  explanation: That's how multi-step analyses are built.
```
