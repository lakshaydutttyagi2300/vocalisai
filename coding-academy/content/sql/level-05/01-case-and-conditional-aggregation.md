---
id: sql-5-1-case-and-conditional-aggregation
title: CASE expressions and conditional aggregation
track: sql
level: 5
order: 1
minutes: 40
summary: Add if-then logic to queries with CASE, label and bucket values, handle NULLs with COALESCE and NULLIF, and build pivot-style summaries with conditional aggregation.
objectives:
  - Write simple and searched CASE expressions
  - Put values into buckets (e.g. price bands, grades)
  - Replace or create NULLs with COALESCE and NULLIF
  - Count and sum with conditions inside aggregates (pivot tables)
prerequisites: [sql-2-2-group-by-having]
tags: [case, when, then, else, end, if, bucket, band, coalesce, nullif, iif, conditional aggregation, pivot, sum case, count case]
---

## Simple explanation

`CASE` is SQL's **if / else**. It looks at each row and returns a value depending on conditions:

```sql
SELECT name, price,
       CASE
           WHEN price < 20  THEN 'budget'
           WHEN price < 60  THEN 'mid-range'
           ELSE 'premium'
       END AS price_band
FROM products;
```

The conditions are checked **top to bottom**; the first true one wins. If none is true and there's no `ELSE`,
the result is NULL.

Put a CASE **inside** an aggregate and you can count or add up only the rows you want - in one pass:

```sql
SELECT COUNT(*) AS orders,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM orders;
```

## Real-world analogy

CASE is the **sorting hat** of SQL: each row is examined and placed into a house (band, label, grade).
Conditional aggregation is **one tally sheet with several columns** - you go through the pile once and make a
mark in the right column for each item.

## Technical definition

- **Searched CASE**: `CASE WHEN cond1 THEN v1 WHEN cond2 THEN v2 ELSE v3 END`.
- **Simple CASE**: `CASE status WHEN 'pending' THEN 'open' WHEN 'shipped' THEN 'open' ELSE 'closed' END`
  (compares one expression with values; can't test NULL this way).
- CASE works anywhere an expression is allowed: SELECT, WHERE, ORDER BY, GROUP BY, inside functions.
- `COALESCE(a, b, c)` - first non-NULL value. `NULLIF(a, b)` - NULL if a = b, otherwise a (great for avoiding
  division by zero: `x / NULLIF(y, 0)`). SQLite also has `IIF(cond, a, b)` (SQL Server too).
- **Conditional aggregation**: `SUM(CASE WHEN cond THEN value ELSE 0 END)`, `COUNT(CASE WHEN cond THEN 1 END)`
  (no ELSE → NULL → not counted), `AVG(CASE WHEN cond THEN value END)`. PostgreSQL also has
  `COUNT(*) FILTER (WHERE cond)`.
- **Pivot**: turning row values (e.g. statuses) into columns with one conditional aggregate per column.
- In SQLite, comparisons give 1/0, so `SUM(status = 'cancelled')` also works - but CASE is portable.

## Step-by-step examples

**Example 1 - labels for scores** (School)

```sql
SELECT student_id, score,
       CASE
           WHEN score IS NULL THEN 'not graded'
           WHEN score >= 70   THEN 'distinction'
           WHEN score >= 40   THEN 'pass'
           ELSE 'fail'
       END AS result
FROM enrollments;
```

`score IS NULL` comes first - otherwise NULL scores would fall through to 'fail'.

**Example 2 - custom sort order**

```sql
SELECT id, status FROM orders
ORDER BY CASE status WHEN 'pending' THEN 1 WHEN 'shipped' THEN 2 ELSE 3 END, id;
```

**Example 3 - a pivot of order statuses per year** (Shop)

```sql
SELECT substr(order_date, 1, 4) AS year,
       COUNT(*) AS orders,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status IN ('cancelled', 'returned') THEN 1 ELSE 0 END) AS lost
FROM orders
GROUP BY year;
```

**Example 4 - safe percentages**

```sql
SELECT ROUND(100.0 * SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END)
             / NULLIF(COUNT(*), 0), 1) AS return_rate_pct
FROM orders;
```

## Common mistakes

- **Forgetting `END`** - syntax error.
- **Wrong order of WHEN branches** - `WHEN score >= 40` before `WHEN score >= 70` labels everyone ≥ 40 as
  "pass".
- **Testing NULL with `WHEN NULL` or `= NULL`** - use `WHEN x IS NULL`.
- **Integer division**: `100 * 3 / 4` is integer maths in SQLite; write `100.0 * ...` for decimals.
- **COUNT(CASE ... ELSE 0 END)** - 0 is not NULL, so it's counted! Use SUM with 1/0, or COUNT without ELSE.
- **Mixed result types** in branches (numbers in one, text in another) - confusing results and sorting.

## Practical application

Reports constantly need categories that aren't stored: age bands, price tiers, "late / on time", "new / returning
customer", RAG (red-amber-green) statuses. Conditional aggregation builds the classic "one row per month, one
column per category" summary that would otherwise need a spreadsheet pivot table.

## Revision notes

- `CASE WHEN ... THEN ... [ELSE ...] END` - first true branch wins; no ELSE → NULL.
- Test NULL with `IS NULL` in a WHEN.
- `COALESCE` replaces NULL; `NULLIF(x, 0)` prevents division by zero.
- Conditional aggregation: `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` - one column per condition = pivot.
- Use `100.0 *` to avoid integer division.

```exercise
id: price-bands
title: Label products by price band
difficulty: beginner
dataset: shop
instructions: |
  Show each product's `name`, `price` and a column **band**: `'budget'` under 20, `'mid-range'` from 20 up to
  (but not including) 60, and `'premium'` for 60 and above.
starter: |
  SELECT name, price
  FROM products;
hints:
  - "`CASE WHEN price < 20 THEN 'budget' WHEN price < 60 THEN 'mid-range' ELSE 'premium' END AS band`"
  - "The second WHEN only runs for rows where the first was false, so `price < 60` is enough."
solution: |
  SELECT name, price,
         CASE
             WHEN price < 20 THEN 'budget'
             WHEN price < 60 THEN 'mid-range'
             ELSE 'premium'
         END AS band
  FROM products;
explanation: |
  Because the branches are checked in order, the second one only sees prices of 20 or more - so it doesn't need
  `price >= 20`.
check:
  columns: true
```

```exercise
id: score-results
title: Results with NULL handled first
difficulty: beginner
dataset: school
instructions: |
  For the **2026-spring** term, show each enrolment's `id`, `score` and a column **result**: `'not graded'` when
  score is NULL, `'distinction'` for 70 or more, `'pass'` for 40-69 and `'fail'` below 40. Sort by `id`.
starter: |
  SELECT id, score,
         CASE
             WHEN score >= 40 THEN 'pass'
             WHEN score >= 70 THEN 'distinction'
             ELSE 'fail'
         END AS result
  FROM enrollments
  WHERE term = '2026-spring'
  ORDER BY id;
hints:
  - "Run the starter: does anyone get 'distinction'? Look at the order of the WHEN branches."
  - "NULL scores currently become 'fail'. Add `WHEN score IS NULL THEN 'not graded'` as the first branch."
solution: |
  SELECT id, score,
         CASE
             WHEN score IS NULL THEN 'not graded'
             WHEN score >= 70 THEN 'distinction'
             WHEN score >= 40 THEN 'pass'
             ELSE 'fail'
         END AS result
  FROM enrollments
  WHERE term = '2026-spring'
  ORDER BY id;
explanation: |
  The starter had two bugs: `>= 40` caught every distinction first, and NULL scores fell through to ELSE. Order
  the branches from most specific to least, and handle NULL explicitly.
check:
  ordered: true
  columns: true
```

```exercise
id: status-pivot
title: A pivot of order statuses by year
difficulty: intermediate
dataset: shop
instructions: |
  One row per year (column **year**, the first 4 characters of `order_date`), with columns **orders** (all
  orders), **delivered**, **cancelled** and **returned** (the number of orders with that status). Sort by year.
starter: |
  SELECT substr(order_date, 1, 4) AS year, status, COUNT(*) AS orders
  FROM orders
  GROUP BY year, status
  ORDER BY year;
hints:
  - "The starter gives one row per year *and status*. A pivot needs one row per year: `GROUP BY year` only."
  - "One column per status: `SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered`."
solution: |
  SELECT substr(order_date, 1, 4) AS year,
         COUNT(*) AS orders,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned
  FROM orders
  GROUP BY year
  ORDER BY year;
explanation: |
  Each CASE turns a row into 1 or 0 for its column, and SUM adds them up per year - the rows become columns in a
  single pass over the table.
check:
  ordered: true
  columns: true
```

```exercise
id: budget-status
title: Budget traffic lights
difficulty: challenge
dataset: expenses
instructions: |
  For **June 2026**, compare spending per expense category with its monthly budget. Show the category `name`,
  **spent** (the total of the amounts as a positive number, rounded to 2 decimals), **budget** (`monthly_amount`)
  and **status**: `'over'` if spent is more than the budget, `'close'` if spent is at least 80% of the budget,
  otherwise `'ok'`. Include only categories that have a budget. Sort by spent, highest first.
starter: |
  SELECT c.name, b.monthly_amount AS budget
  FROM budgets AS b
  JOIN categories AS c ON c.id = b.category_id;
hints:
  - "Join budgets → categories → transactions (`t.category_id = b.category_id`) and filter `t.tx_date BETWEEN '2026-06-01' AND '2026-06-30'`."
  - "Expenses are negative: `ROUND(-SUM(t.amount), 2) AS spent`. Group by `c.name, b.monthly_amount`."
  - "In the CASE you can't use the alias `spent` - repeat the expression: `CASE WHEN -SUM(t.amount) > b.monthly_amount THEN 'over' WHEN -SUM(t.amount) >= 0.8 * b.monthly_amount THEN 'close' ELSE 'ok' END`."
solution: |
  SELECT c.name,
         ROUND(-SUM(t.amount), 2) AS spent,
         b.monthly_amount AS budget,
         CASE
             WHEN -SUM(t.amount) > b.monthly_amount THEN 'over'
             WHEN -SUM(t.amount) >= 0.8 * b.monthly_amount THEN 'close'
             ELSE 'ok'
         END AS status
  FROM budgets AS b
  JOIN categories AS c ON c.id = b.category_id
  JOIN transactions AS t ON t.category_id = b.category_id
  WHERE t.tx_date BETWEEN '2026-06-01' AND '2026-06-30'
  GROUP BY c.name, b.monthly_amount
  ORDER BY spent DESC;
explanation: |
  The CASE works on aggregated values here, so it is evaluated once per group. Categories with a budget but no
  June spending would be missing (INNER JOIN) - a LEFT JOIN with the date condition in ON and COALESCE would
  include them as 'ok'.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What does a CASE expression return when no WHEN is true and there is no ELSE?
  options:
    - 'NULL'
    - '0'
    - An error
    - The first THEN value
  answer: 'NULL'
  explanation: Add ELSE when you need a default value.
- id: q2
  question: "`CASE WHEN score >= 40 THEN 'pass' WHEN score >= 70 THEN 'distinction' END` - what does a score of 85 get?"
  options:
    - pass
    - distinction
    - 'NULL'
    - Both
  answer: pass
  explanation: The first true branch wins. Put the most specific condition first.
- id: q3
  question: How do you count only cancelled orders inside a summary query?
  options:
    - SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)
    - COUNT(status = 'cancelled' ELSE 0)
    - COUNT(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)
    - WHERE COUNT(status) = 'cancelled'
  answer: SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)
  explanation: COUNT with ELSE 0 counts every row, because 0 is not NULL.
- id: q4
  question: What does NULLIF(total, 0) return when total is 0?
  options:
    - 'NULL'
    - '0'
    - '1'
    - An error
  answer: 'NULL'
  explanation: Dividing by NULL gives NULL instead of a division-by-zero problem.
- id: q5
  question: What does COALESCE(phone, email, 'no contact') return when phone is NULL and email is 'a@b.c'?
  options:
    - a@b.c
    - 'NULL'
    - no contact
    - phone
  answer: a@b.c
  explanation: COALESCE returns the first value that isn't NULL.
- id: q6
  question: In SQLite, what is 7 / 2?
  options:
    - '3'
    - '3.5'
    - '4'
    - An error
  answer: '3'
  explanation: Two integers give integer division. Use 7.0 / 2 or 7 * 1.0 / 2 for 3.5.
```
