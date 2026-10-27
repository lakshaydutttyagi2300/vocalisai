---
id: sql-6-1-ranking-window-functions
title: Window functions - ranking and PARTITION BY
track: sql
level: 6
order: 1
minutes: 50
summary: Calculate across related rows without collapsing them - ROW_NUMBER, RANK, DENSE_RANK and NTILE, per-group rankings with PARTITION BY, and "top N per group" queries.
objectives:
  - Explain how a window function differs from GROUP BY
  - Number and rank rows with ROW_NUMBER, RANK and DENSE_RANK and explain how they treat ties
  - Restart a ranking for each group with PARTITION BY
  - Answer "top N per group" questions with a ranking in a CTE
  - Compare each row with its group's total or average using aggregate window functions
prerequisites: [sql-5-4-ctes-and-set-operations]
tags: [window function, over, partition by, row_number, rank, dense_rank, ntile, top n per group, ranking, ties, analytic function]
---

## Simple explanation

`GROUP BY` squashes many rows into one per group. A **window function** calculates across a group of rows but
**keeps every row**. You recognise it by `OVER (...)`:

```sql
SELECT first_name, salary,
       RANK() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees;
```

Every employee is still listed - with their position in the salary ranking added.

Add `PARTITION BY` to restart the calculation for each group:

```sql
SELECT first_name, department_id, salary,
       RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank_in_department
FROM employees;
```

## Real-world analogy

A race has runners from several clubs. **GROUP BY** gives you one line per club ("club A: average time 31
min"). A **window function** keeps the full results sheet and adds columns like "overall position" and "position
within club" next to each runner. PARTITION BY is "within club"; ORDER BY inside OVER is "by finishing time".

## Technical definition

- Syntax: `function() OVER ([PARTITION BY cols] [ORDER BY cols] [frame])`.
- Window functions run **after** WHERE, GROUP BY and HAVING, and before the final ORDER BY - so you can't use
  them in WHERE. To filter on them, wrap the query in a CTE/subquery (`WHERE rn <= 3`).
- **Ranking functions** (need ORDER BY in OVER):
  - `ROW_NUMBER()` - 1, 2, 3, 4 - always unique; ties are broken arbitrarily unless you add a tie-breaker.
  - `RANK()` - ties share a rank and leave gaps: 1, 2, 2, 4.
  - `DENSE_RANK()` - ties share a rank, no gaps: 1, 2, 2, 3.
  - `NTILE(n)` - splits rows into n nearly equal buckets (quartiles with n = 4).
  - `PERCENT_RANK()`, `CUME_DIST()` - relative positions from 0 to 1.
- **Aggregate window functions**: `SUM/AVG/COUNT/MIN/MAX(...) OVER (PARTITION BY ...)` - the group's value on
  every row, e.g. a row's share of its group's total.
- Supported by SQLite 3.25+, PostgreSQL, MySQL 8+, SQL Server - same syntax.

## Step-by-step examples

**Example 1 - three ranking functions side by side** (Company)

```sql
SELECT first_name, salary,
       ROW_NUMBER() OVER (ORDER BY salary) AS row_num,
       RANK()       OVER (ORDER BY salary) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary) AS dense_rnk
FROM employees
ORDER BY salary
LIMIT 6;
```

Two employees earn exactly 41000: ROW_NUMBER gives them different numbers, RANK and DENSE_RANK the same.

**Example 2 - share of the department's salary bill**

```sql
SELECT first_name, department_id, salary,
       SUM(salary) OVER (PARTITION BY department_id) AS department_total,
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY department_id), 1) AS pct_of_department
FROM employees
WHERE department_id IS NOT NULL;
```

**Example 3 - top 3 earners per department**

```sql
WITH ranked AS (
    SELECT first_name, last_name, department_id, salary,
           ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, id) AS rn
    FROM employees
    WHERE department_id IS NOT NULL
)
SELECT * FROM ranked WHERE rn <= 3;
```

**Example 4 - salary quartiles**

```sql
SELECT first_name, salary, NTILE(4) OVER (ORDER BY salary) AS quartile
FROM employees;
```

## Common mistakes

- **Using a window function in WHERE** - not allowed; filter in an outer query/CTE.
- **ROW_NUMBER for "top N" with ties** - one of two equal values is dropped arbitrarily. Use RANK/DENSE_RANK if
  ties should both count, or add a tie-breaker column.
- **Forgetting PARTITION BY** - the ranking runs over the whole table instead of per group.
- **Confusing the ORDER BY inside OVER** (how to rank) with the query's final ORDER BY (how to display).
- **Integer division** in percentages - use `100.0 *`.

## Practical application

Leaderboards, "best-selling product in each category", "latest order per customer" (ROW_NUMBER ordered by date
descending, keep rn = 1), "each region's share of total sales", salary bands and percentiles - window functions
answer these elegantly. They are also a favourite topic in SQL job interviews.

## Revision notes

- `func() OVER (PARTITION BY ... ORDER BY ...)` - calculates across rows, keeps every row.
- ROW_NUMBER unique; RANK gaps after ties; DENSE_RANK no gaps; NTILE(n) buckets.
- Aggregates with OVER give group totals on each row.
- Filter on a window result in an outer query/CTE (`WHERE rn <= 3`).

```exercise
id: salary-ranking
title: Rank employees by salary
difficulty: beginner
dataset: company
instructions: |
  Show every employee's `first_name`, `last_name`, `salary` and their **salary_rank**, where the highest salary
  is rank 1 and employees with equal salaries share a rank (leaving a gap after ties).
starter: |
  SELECT first_name, last_name, salary
  FROM employees
  ORDER BY salary DESC;
hints:
  - "Ties share a rank with gaps → `RANK()`."
  - "`RANK() OVER (ORDER BY salary DESC) AS salary_rank`"
solution: |
  SELECT first_name, last_name, salary,
         RANK() OVER (ORDER BY salary DESC) AS salary_rank
  FROM employees
  ORDER BY salary DESC;
explanation: |
  The two employees earning 41000 get the same rank, and the next rank number is skipped. DENSE_RANK would not
  skip a number; ROW_NUMBER would give them different numbers.
check:
  columns: true
```

```exercise
id: course-dense-rank
title: Rank scores within each course
difficulty: beginner
dataset: school
instructions: |
  For the **2025-autumn** term, show `course_id`, `student_id`, `score` and **place** - the student's position
  within their course by score (highest = 1). Equal scores share a place and the next place follows without a
  gap.
starter: |
  SELECT course_id, student_id, score
  FROM enrollments
  WHERE term = '2025-autumn';
hints:
  - "No gaps after ties → `DENSE_RANK()`."
  - "Restart for each course: `OVER (PARTITION BY course_id ORDER BY score DESC)`."
solution: |
  SELECT course_id, student_id, score,
         DENSE_RANK() OVER (PARTITION BY course_id ORDER BY score DESC) AS place
  FROM enrollments
  WHERE term = '2025-autumn';
explanation: |
  PARTITION BY course_id starts the ranking again at 1 for every course; DENSE_RANK makes tied scores share a place
  without skipping the next one.
check:
  columns: true
```

```exercise
id: top-products-per-category
title: Top 2 products in each category
difficulty: intermediate
dataset: shop
instructions: |
  Find the **two products with the highest revenue in each category**, where revenue is the sum of
  `quantity * unit_price` over all order items. Show `category_id`, product `name`, **revenue** (rounded to 2
  decimals) and **rn** (1 or 2). If two products tie, the one with the lower product id comes first.
starter: |
  SELECT p.category_id, p.name, ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
  FROM order_items AS i
  JOIN products AS p ON p.id = i.product_id
  GROUP BY p.id, p.category_id, p.name;
hints:
  - "Put the starter in a CTE (e.g. `product_revenue`, also keep `p.id AS product_id`)."
  - "Add `ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC, product_id) AS rn` in a second step."
  - "Window results can't be filtered in the same SELECT - filter `WHERE rn <= 2` in an outer query."
solution: |
  WITH product_revenue AS (
      SELECT p.id AS product_id, p.category_id, p.name,
             SUM(i.quantity * i.unit_price) AS revenue
      FROM order_items AS i
      JOIN products AS p ON p.id = i.product_id
      GROUP BY p.id, p.category_id, p.name
  ),
  ranked AS (
      SELECT category_id, name, revenue,
             ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC, product_id) AS rn
      FROM product_revenue
  )
  SELECT category_id, name, ROUND(revenue, 2) AS revenue, rn
  FROM ranked
  WHERE rn <= 2;
explanation: |
  Step 1 totals each product; step 2 numbers products within each category; the final query keeps numbers 1 and 2.
  This "rank in a CTE, then filter" pattern solves every "top N per group" question.
check:
  columns: true
```

```exercise
id: department-share
title: Share of the department's salary bill
difficulty: challenge
dataset: company
instructions: |
  For employees **with a department**, show `first_name`, `last_name`, `department_id`, `salary`, the
  department's average salary (column **dept_avg**, rounded to 0 decimals) and the difference between the
  employee's salary and that average (column **vs_avg**, rounded to 0 decimals). Also add **quartile**: the
  employee's salary quartile across the **whole company** (NTILE(4), 1 = lowest salaries, ties broken by `id`).
starter: |
  SELECT first_name, last_name, department_id, salary
  FROM employees
  WHERE department_id IS NOT NULL;
hints:
  - "Department average on every row: `AVG(salary) OVER (PARTITION BY department_id)`."
  - "`ROUND(salary - AVG(salary) OVER (PARTITION BY department_id), 0) AS vs_avg`"
  - "`NTILE(4) OVER (ORDER BY salary, id) AS quartile` - no PARTITION BY, because it's company-wide (among employees with a department)."
solution: |
  SELECT first_name, last_name, department_id, salary,
         ROUND(AVG(salary) OVER (PARTITION BY department_id), 0) AS dept_avg,
         ROUND(salary - AVG(salary) OVER (PARTITION BY department_id), 0) AS vs_avg,
         NTILE(4) OVER (ORDER BY salary, id) AS quartile
  FROM employees
  WHERE department_id IS NOT NULL;
explanation: |
  Different window functions in one query can use different windows: two are per department, NTILE runs across all
  rows that passed the WHERE. GROUP BY couldn't show individual salaries next to group averages like this.
check:
  columns: true
```

```quiz
- id: q1
  question: How does a window function differ from GROUP BY?
  options:
    - It calculates across related rows but keeps every row in the result
    - It always returns one row per table
    - It can only count rows
    - It removes duplicate rows
  answer: It calculates across related rows but keeps every row in the result
  explanation: GROUP BY collapses rows into one per group.
- id: q2
  question: Scores 90, 85, 85, 80 ranked highest first with RANK() give which ranks?
  options:
    - 1, 2, 2, 4
    - 1, 2, 3, 4
    - 1, 2, 2, 3
    - 1, 1, 1, 1
  answer: 1, 2, 2, 4
  explanation: RANK leaves a gap after ties; DENSE_RANK would give 1, 2, 2, 3.
- id: q3
  question: What does PARTITION BY department_id do inside OVER?
  options:
    - Restarts the calculation for each department
    - Sorts the final result by department
    - Removes departments with one employee
    - Groups rows like GROUP BY and collapses them
  answer: Restarts the calculation for each department
  explanation: Each department becomes its own window.
- id: q4
  question: Why can't you write `WHERE ROW_NUMBER() OVER (...) <= 3`?
  options:
    - Window functions are calculated after WHERE; filter in an outer query or CTE
    - ROW_NUMBER only works with GROUP BY
    - 3 is too small
    - WHERE can't compare numbers
  answer: Window functions are calculated after WHERE; filter in an outer query or CTE
  explanation: Rank in a CTE, then WHERE rn <= 3 outside.
- id: q5
  question: Which function splits rows into 4 roughly equal groups?
  options:
    - NTILE(4)
    - RANK(4)
    - GROUP(4)
    - LIMIT 4
  answer: NTILE(4)
  explanation: Useful for quartiles; NTILE(10) gives deciles.
- id: q6
  question: What does `SUM(salary) OVER (PARTITION BY department_id)` show on each row?
  options:
    - The total salary of that row's department
    - The running total of all salaries
    - The employee's own salary
    - The number of departments
  answer: The total salary of that row's department
  explanation: Without ORDER BY in OVER, the whole partition is the window.
```
