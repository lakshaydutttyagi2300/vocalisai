---
id: sql-5-3-subqueries-and-exists
title: Subqueries, correlated subqueries and EXISTS
track: sql
level: 5
order: 3
minutes: 45
summary: Use a query inside another query - as a single value, as a list for IN, as a temporary table in FROM - and write correlated subqueries and EXISTS / NOT EXISTS checks.
objectives:
  - Use a scalar subquery to compare against a calculated value
  - Filter with IN (subquery) and NOT IN safely
  - Write correlated subqueries that refer to the outer row
  - Test for related rows with EXISTS and NOT EXISTS
  - Use a subquery in FROM as a derived table
prerequisites: [sql-4-2-left-join-and-nulls]
tags: [subquery, nested query, scalar subquery, in, not in, exists, not exists, correlated subquery, derived table, inline view]
---

## Simple explanation

A **subquery** is a query in brackets inside another query. SQL runs the inner question first and uses its
answer:

```sql
-- Which products cost more than the average product?
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

You can't write `WHERE price > AVG(price)` (aggregates aren't allowed in WHERE), but a subquery that **returns
one value** works anywhere a value is allowed.

A subquery can also return a **list** (used with `IN`) or a whole **table** (used in `FROM`).

## Real-world analogy

"Invite everyone **who scored above the class average**." First you work out the class average (inner
question), then you go down the list comparing each score with it (outer question). A **correlated** subquery is
"above **their own team's** average": the inner question is asked again for each person.

## Technical definition

- **Scalar subquery**: returns exactly one row and one column; usable in SELECT, WHERE, HAVING.
- **IN subquery**: `WHERE id IN (SELECT customer_id FROM orders WHERE ...)` - the subquery returns one column.
- **NOT IN trap**: if the subquery's list contains a NULL, `NOT IN` returns no rows at all. Prefer `NOT EXISTS`,
  or filter NULLs out inside the subquery.
- **Correlated subquery**: refers to a column of the outer query (`WHERE e2.department_id = e.department_id`);
  conceptually re-evaluated for each outer row.
- **EXISTS (subquery)**: true if the subquery returns at least one row (the selected columns don't matter -
  `SELECT 1` is conventional). `NOT EXISTS` finds rows with no related rows (an anti-join).
- **Derived table**: `FROM (SELECT ...) AS t` - a subquery used as a temporary table; it must have an alias.
- Subqueries vs joins: many questions can be written either way. Use whichever is clearer; the database often
  runs them the same way.

## Step-by-step examples

**Example 1 - IN with a subquery** (School)

```sql
SELECT first_name, last_name
FROM students
WHERE id IN (SELECT student_id FROM enrollments WHERE score >= 90);
```

**Example 2 - correlated: above your department's average** (Company)

```sql
SELECT e.first_name, e.salary, e.department_id
FROM employees AS e
WHERE e.salary > (SELECT AVG(e2.salary)
                  FROM employees AS e2
                  WHERE e2.department_id = e.department_id);
```

**Example 3 - EXISTS / NOT EXISTS** (Shop)

```sql
-- customers with at least one returned order
SELECT c.id, c.first_name
FROM customers AS c
WHERE EXISTS (SELECT 1 FROM orders AS o
              WHERE o.customer_id = c.id AND o.status = 'returned');
```

**Example 4 - derived table: average order value**

```sql
SELECT ROUND(AVG(order_total), 2) AS avg_order_value
FROM (SELECT order_id, SUM(quantity * unit_price) AS order_total
      FROM order_items
      GROUP BY order_id) AS totals;
```

`AVG(SUM(...))` isn't allowed directly; the derived table computes the per-order totals first.

## Common mistakes

- **A "scalar" subquery returning several rows** - other databases raise an error; SQLite silently uses the first
  row. Make sure it returns one value (use an aggregate or a unique condition).
- **NOT IN with NULLs** - returns nothing. Use NOT EXISTS.
- **Forgetting the alias on a derived table** - required in most databases.
- **Correlated subqueries on huge tables** - can be slow; a join with GROUP BY is often faster.
- **Over-nesting** - three levels of brackets are hard to read. Use CTEs (next lesson).

## Practical application

"Above average", "more than their own team's average", "customers who have / have never done X", "products not
sold this quarter" and "average of per-customer totals" are classic business questions - and typical interview
questions. Subqueries and EXISTS answer them directly.

## Revision notes

- Scalar subquery = one value; use it where a value fits.
- `IN (SELECT col ...)`; beware `NOT IN` with NULLs - prefer `NOT EXISTS`.
- Correlated subqueries refer to the outer row.
- `EXISTS (SELECT 1 ...)` tests whether related rows exist.
- Derived tables: `FROM (SELECT ...) AS alias` - aggregate in steps.

```exercise
id: above-average-price
title: Products above the average price
difficulty: beginner
dataset: shop
instructions: |
  Show the `name` and `price` of products that cost **more than the average price of all products**, most
  expensive first.
starter: |
  SELECT name, price
  FROM products
  WHERE price > AVG(price)
  ORDER BY price DESC;
hints:
  - "Run the starter - aggregates aren't allowed in WHERE."
  - "Replace `AVG(price)` with a subquery: `(SELECT AVG(price) FROM products)`."
solution: |
  SELECT name, price
  FROM products
  WHERE price > (SELECT AVG(price) FROM products)
  ORDER BY price DESC;
explanation: |
  The subquery returns one number (the average); the outer query compares every product with it.
check:
  ordered: true
```

```exercise
id: databases-students
title: Students in the Databases course
difficulty: beginner
dataset: school
instructions: |
  List the `first_name` and `last_name` of students enrolled in the course titled **Databases**, using `IN` with
  a subquery (no JOIN). Sort by last name, then first name.
starter: |
  SELECT first_name, last_name
  FROM students
  ORDER BY last_name, first_name;
hints:
  - "The inner query should return student ids: `SELECT student_id FROM enrollments WHERE course_id = ...`."
  - "Find the course id with another subquery: `(SELECT id FROM courses WHERE title = 'Databases')`."
  - "`WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE title = 'Databases'))`"
solution: |
  SELECT first_name, last_name
  FROM students
  WHERE id IN (SELECT student_id
               FROM enrollments
               WHERE course_id = (SELECT id FROM courses WHERE title = 'Databases'))
  ORDER BY last_name, first_name;
explanation: |
  Read it from the inside out: find the course's id, then the ids of students enrolled in it, then those
  students' names. Using IN also avoids duplicate names if a student enrolled twice.
check:
  ordered: true
```

```exercise
id: above-department-average
title: Paid above their department's average
difficulty: intermediate
dataset: company
instructions: |
  Show `first_name`, `last_name`, `salary` and `department_id` of employees whose salary is **higher than the
  average salary of their own department**. Sort by department, then salary (highest first).
starter: |
  SELECT first_name, last_name, salary, department_id
  FROM employees
  WHERE salary > (SELECT AVG(salary) FROM employees)
  ORDER BY department_id, salary DESC;
hints:
  - "The starter compares with the company-wide average. You need each employee's own department."
  - "Give the outer table an alias (`e`) and the inner one another (`e2`), then add `WHERE e2.department_id = e.department_id` inside the subquery."
solution: |
  SELECT e.first_name, e.last_name, e.salary, e.department_id
  FROM employees AS e
  WHERE e.salary > (SELECT AVG(e2.salary)
                    FROM employees AS e2
                    WHERE e2.department_id = e.department_id)
  ORDER BY e.department_id, e.salary DESC;
explanation: |
  The subquery is correlated: it uses `e.department_id` from the outer row, so each employee is compared with
  their own department's average. Contractors (no department) never match, because `= NULL` is never true.
check:
  ordered: true
```

```exercise
id: returned-customers
title: Customers with a returned order
difficulty: intermediate
dataset: shop
instructions: |
  Using **EXISTS**, list `id`, `first_name` and `last_name` of customers who have at least one order with status
  **returned**. Sort by `id`.
starter: |
  SELECT c.id, c.first_name, c.last_name
  FROM customers AS c
  ORDER BY c.id;
hints:
  - "`WHERE EXISTS (SELECT 1 FROM orders AS o WHERE ...)`"
  - "Inside: `o.customer_id = c.id AND o.status = 'returned'`."
solution: |
  SELECT c.id, c.first_name, c.last_name
  FROM customers AS c
  WHERE EXISTS (SELECT 1
                FROM orders AS o
                WHERE o.customer_id = c.id AND o.status = 'returned')
  ORDER BY c.id;
explanation: |
  EXISTS only asks "is there at least one such order?", so each customer appears once even if they returned
  several orders - unlike a JOIN, which would repeat them.
check:
  ordered: true
  require_text: [EXISTS]
```

```exercise
id: segment-order-value
title: Average order value by segment
difficulty: challenge
dataset: shop
instructions: |
  For each customer `segment`, show the number of orders (column **orders**) and the **average order value**
  (column **avg_order_value**, rounded to 2 decimals), where an order's value is the sum of
  `quantity * unit_price` over its items. Count only **delivered** orders. Sort by `avg_order_value`, highest
  first.
starter: |
  SELECT c.segment, AVG(SUM(i.quantity * i.unit_price)) AS avg_order_value
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
  JOIN order_items AS i ON i.order_id = o.id
  GROUP BY c.segment;
hints:
  - "Aggregates can't be nested. First compute one total per order in a derived table: `(SELECT order_id, SUM(quantity * unit_price) AS order_total FROM order_items GROUP BY order_id) AS t`."
  - "Join that to orders (`o.id = t.order_id`) and customers, filter `o.status = 'delivered'`, then `GROUP BY c.segment`."
  - "`COUNT(*) AS orders, ROUND(AVG(t.order_total), 2) AS avg_order_value`"
solution: |
  SELECT c.segment,
         COUNT(*) AS orders,
         ROUND(AVG(t.order_total), 2) AS avg_order_value
  FROM (SELECT order_id, SUM(quantity * unit_price) AS order_total
        FROM order_items
        GROUP BY order_id) AS t
  JOIN orders AS o ON o.id = t.order_id
  JOIN customers AS c ON c.id = o.customer_id
  WHERE o.status = 'delivered'
  GROUP BY c.segment
  ORDER BY avg_order_value DESC;
explanation: |
  The derived table turns many item rows into one row per order. Averaging those totals gives the true average
  order value; averaging item rows directly would give the average *line* value instead.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: Why does `WHERE price > AVG(price)` fail?
  options:
    - Aggregate functions are not allowed in WHERE; use a subquery
    - AVG only works on integers
    - price is a reserved word
    - WHERE can't use >
  answer: Aggregate functions are not allowed in WHERE; use a subquery
  explanation: WHERE runs before grouping; a subquery calculates the average separately.
- id: q2
  question: What is a correlated subquery?
  options:
    - A subquery that refers to a column of the outer query's current row
    - A subquery in the FROM clause
    - Two subqueries joined together
    - A subquery that returns one value
  answer: A subquery that refers to a column of the outer query's current row
  explanation: e.g. comparing with the average of the employee's own department.
- id: q3
  question: Why can `WHERE id NOT IN (SELECT manager_id FROM employees)` return no rows at all?
  options:
    - The CEO's manager_id is NULL, and NOT IN with a NULL in the list is never true
    - NOT IN is not valid SQL
    - Subqueries can't use the same table
    - manager_id is a text column
  answer: The CEO's manager_id is NULL, and NOT IN with a NULL in the list is never true
  explanation: Use NOT EXISTS, or add WHERE manager_id IS NOT NULL inside the subquery.
- id: q4
  question: What does EXISTS (subquery) check?
  options:
    - Whether the subquery returns at least one row
    - Whether a table exists
    - Whether a column contains NULL
    - Whether two values are equal
  answer: Whether the subquery returns at least one row
  explanation: The selected columns don't matter, so SELECT 1 is common.
- id: q5
  question: What must a subquery in the FROM clause have in most databases?
  options:
    - An alias, e.g. ) AS totals
    - An ORDER BY
    - A LIMIT
    - A WHERE clause
  answer: An alias, e.g. ) AS totals
  explanation: The outer query refers to the derived table by its alias.
- id: q6
  question: Which subquery can be used with `=` in `WHERE course_id = (...)`?
  options:
    - One that returns exactly one value
    - One that returns many rows
    - One that returns several columns
    - Any subquery
  answer: One that returns exactly one value
  explanation: For several values use IN.
```
