---
id: sql-4-2-left-join-and-nulls
title: LEFT JOIN, missing matches and other join types
track: sql
level: 4
order: 2
minutes: 45
summary: Keep rows that have no match with LEFT JOIN, find "missing" data with anti-joins, count correctly with COUNT(column), and meet RIGHT, FULL and CROSS joins.
objectives:
  - Use LEFT JOIN to keep every row of the left table
  - Find rows with no match (customers without orders, courses without students)
  - Count related rows correctly, including zero
  - Explain why a condition belongs in ON or in WHERE with a LEFT JOIN
  - Recognise RIGHT, FULL OUTER and CROSS joins
prerequisites: [sql-4-1-inner-join]
tags: [left join, left outer join, right join, full outer join, cross join, anti join, null, unmatched, missing, count zero, coalesce]
---

## Simple explanation

INNER JOIN drops rows that have no partner. **LEFT JOIN keeps every row from the left table**, and fills the
right table's columns with **NULL** when there is no match:

```sql
SELECT co.title, e.student_id
FROM courses AS co
LEFT JOIN enrollments AS e ON e.course_id = co.id
WHERE co.title = 'Data Visualisation';
```

Data Visualisation has no enrolments, so you get one row: `Data Visualisation | NULL`. With an INNER JOIN, the
course would vanish from the result.

That NULL is useful: **"rows where the right side is NULL" = rows with no match** - customers who never
ordered, products never sold, employees on no project.

## Real-world analogy

A **guest list** (left) and the **RSVP replies** (right). An INNER JOIN shows only guests who replied. A LEFT
JOIN shows **every guest**, with an empty reply column for those who haven't answered - exactly the people you
need to chase.

## Technical definition

- `A LEFT [OUTER] JOIN B ON ...` - all rows of A; B's columns are NULL where no B row matches.
- **Anti-join** (rows of A with no match in B): `A LEFT JOIN B ON ... WHERE B.id IS NULL` (or `NOT EXISTS`,
  Level 5).
- **Counting with LEFT JOIN**: `COUNT(B.id)` counts matches (0 for none); `COUNT(*)` counts rows, which is 1
  even for an unmatched row.
- **ON vs WHERE**: in a LEFT JOIN, a condition on B placed in **ON** limits which B rows match (A rows are still
  kept); the same condition in **WHERE** filters the final rows and removes unmatched A rows (turning it into an
  inner join).
- `COALESCE(value, fallback)` replaces NULL: `COALESCE(SUM(...), 0)`.
- `RIGHT JOIN` keeps all rows of the right table; `FULL [OUTER] JOIN` keeps all rows of both. SQLite supports
  them since version 3.39; MySQL has no FULL JOIN (use LEFT JOIN ... UNION ... RIGHT JOIN).
- `CROSS JOIN` pairs every row with every row - useful for generating combinations (sizes × colours), dangerous
  by accident.

## Step-by-step examples

**Example 1 - number of orders per customer, including zero** (Shop)

```sql
SELECT c.id, c.first_name, COUNT(o.id) AS orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.first_name
ORDER BY orders, c.id;
```

The first rows show customers with 0 orders. `COUNT(*)` would have shown 1 for them.

**Example 2 - anti-join: customers who never ordered**

```sql
SELECT c.id, c.first_name, c.last_name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

**Example 3 - ON vs WHERE**

```sql
-- Every customer, with their 2026 orders counted (0 if none in 2026):
SELECT c.id, COUNT(o.id) AS orders_2026
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.order_date >= '2026-01-01'
GROUP BY c.id;
```

Moving `o.order_date >= '2026-01-01'` to a WHERE clause would remove customers without 2026 orders entirely.

**Example 4 - CROSS JOIN to build combinations** (any database)

```sql
SELECT s.size, c.colour
FROM (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L') AS s
CROSS JOIN (SELECT 'red' AS colour UNION ALL SELECT 'blue') AS c;
```

## Common mistakes

- **COUNT(*) with a LEFT JOIN** - unmatched rows count as 1. Count a column from the right table.
- **Filtering the right table in WHERE** - silently turns the LEFT JOIN into an INNER JOIN. Put it in ON.
- **Checking the wrong column for NULL in an anti-join** - test the right table's key (`o.id IS NULL`), not a
  column that can be NULL anyway.
- **LEFT JOIN with the tables in the wrong order** - the table whose rows you must keep goes on the **left**.
- **SUM over no rows gives NULL**, not 0 - wrap with `COALESCE(SUM(...), 0)`.

## Practical application

"Who hasn't..." questions are everywhere: customers who haven't ordered this year (marketing), products with no
sales (stock clearance), students not enrolled (admin), employees not on a project (resourcing), invoices without
payments (finance). LEFT JOIN + `IS NULL`, and LEFT JOIN + `COUNT(column)`, answer them all.

## Revision notes

- LEFT JOIN keeps all left rows; missing right side = NULL.
- Anti-join: `LEFT JOIN ... WHERE right.id IS NULL`.
- Count matches with `COUNT(right.id)`; use `COALESCE(..., 0)` for sums.
- Right-table conditions go in ON to keep unmatched left rows.
- RIGHT / FULL OUTER (SQLite 3.39+) and CROSS JOIN exist; LEFT JOIN is by far the most used.

```exercise
id: courses-with-counts
title: Every course with its number of enrolments
difficulty: beginner
dataset: school
instructions: |
  Show every course `title` and how many enrolments it has (column **enrolments**), **including courses with
  none**. Sort by enrolments (highest first), then title.
starter: |
  SELECT co.title, COUNT(*) AS enrolments
  FROM courses AS co
  JOIN enrollments AS e ON e.course_id = co.id
  GROUP BY co.title
  ORDER BY enrolments DESC, co.title;
hints:
  - "The starter uses an INNER JOIN, so Data Visualisation (no enrolments) is missing. Which join keeps it?"
  - "With a LEFT JOIN, `COUNT(*)` would give Data Visualisation 1. Count `e.id` instead."
solution: |
  SELECT co.title, COUNT(e.id) AS enrolments
  FROM courses AS co
  LEFT JOIN enrollments AS e ON e.course_id = co.id
  GROUP BY co.title
  ORDER BY enrolments DESC, co.title;
explanation: |
  LEFT JOIN keeps all 8 courses. `COUNT(e.id)` counts only real enrolment rows, so Data Visualisation correctly
  shows 0.
check:
  ordered: true
  columns: true
```

```exercise
id: customers-without-orders
title: Customers who never ordered
difficulty: beginner
dataset: shop
instructions: |
  List the `id`, `first_name`, `last_name` and `signup_date` of customers who have **no orders at all**, using a
  LEFT JOIN. Sort by `id`.
starter: |
  SELECT c.id, c.first_name, c.last_name, c.signup_date
  FROM customers AS c
  ORDER BY c.id;
hints:
  - "`LEFT JOIN orders AS o ON o.customer_id = c.id`"
  - "Keep only the rows where no order matched: `WHERE o.id IS NULL`."
solution: |
  SELECT c.id, c.first_name, c.last_name, c.signup_date
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer_id = c.id
  WHERE o.id IS NULL
  ORDER BY c.id;
explanation: |
  Customers with orders produce rows where `o.id` has a value; customers without orders produce one row with
  `o.id` NULL. Filtering on `o.id IS NULL` keeps exactly the six customers who never ordered.
check:
  ordered: true
```

```exercise
id: on-vs-where
title: Keep everyone - condition in ON
difficulty: intermediate
dataset: shop
instructions: |
  For **every** customer, show `id`, `first_name` and the number of their orders placed in **2026** (column
  **orders_2026**) - customers with no 2026 orders must appear with 0. Sort by `orders_2026` descending, then
  `id`.
starter: |
  SELECT c.id, c.first_name, COUNT(o.id) AS orders_2026
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer_id = c.id
  WHERE o.order_date >= '2026-01-01'
  GROUP BY c.id, c.first_name
  ORDER BY orders_2026 DESC, c.id;
hints:
  - "Run the starter: how many customers are listed? Customers without 2026 orders are missing."
  - "The WHERE removes rows where `o.order_date` is NULL - i.e. customers with no matching order."
  - "Move the date condition into the ON clause: `ON o.customer_id = c.id AND o.order_date >= '2026-01-01'`."
solution: |
  SELECT c.id, c.first_name, COUNT(o.id) AS orders_2026
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer_id = c.id AND o.order_date >= '2026-01-01'
  GROUP BY c.id, c.first_name
  ORDER BY orders_2026 DESC, c.id;
explanation: |
  In ON, the date condition only decides which orders count as matches; every customer is still kept. In WHERE, it
  ran after the join and threw away the customers whose order columns were NULL.
check:
  ordered: true
  columns: true
```

```exercise
id: idle-employees
title: Employees on no project
difficulty: challenge
dataset: company
instructions: |
  Show each **department** name (column **department**) with the number of its employees who are **not assigned
  to any project** (column **unassigned**). Include only employees who have a department, and only departments
  with at least one unassigned employee. Sort by `unassigned` descending, then department.
starter: |
  SELECT d.name AS department, COUNT(*) AS unassigned
  FROM employees AS e
  JOIN departments AS d ON d.id = e.department_id
  GROUP BY d.name;
hints:
  - "Add `LEFT JOIN project_assignments AS a ON a.employee_id = e.id` and keep `WHERE a.employee_id IS NULL`."
  - "The INNER JOIN to departments already drops employees without a department."
  - "Finish with `GROUP BY d.name ORDER BY unassigned DESC, department`."
solution: |
  SELECT d.name AS department, COUNT(*) AS unassigned
  FROM employees AS e
  JOIN departments AS d ON d.id = e.department_id
  LEFT JOIN project_assignments AS a ON a.employee_id = e.id
  WHERE a.employee_id IS NULL
  GROUP BY d.name
  ORDER BY unassigned DESC, department;
explanation: |
  Mixing join types is normal: INNER JOIN where a match is required (department), LEFT JOIN where you are looking
  for the absence of a match (assignments). After the anti-join filter, each remaining row is one unassigned
  employee, so COUNT(*) is correct here.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What does a LEFT JOIN do with a left-table row that has no match?
  options:
    - Keeps it, with NULL in the right table's columns
    - Removes it
    - Pairs it with every right row
    - Raises an error
  answer: Keeps it, with NULL in the right table's columns
  explanation: That's the difference from INNER JOIN.
- id: q2
  question: How do you find customers with no orders using a LEFT JOIN?
  options:
    - LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL
    - JOIN orders o ON o.customer_id = c.id WHERE o.id = 0
    - LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id = NULL
    - RIGHT JOIN customers WHERE customers IS EMPTY
  answer: LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL
  explanation: Unmatched rows have NULL in the right table's key; test it with IS NULL.
- id: q3
  question: With a LEFT JOIN, a customer with no orders gets which value from COUNT(o.id)?
  options:
    - '0'
    - '1'
    - 'NULL'
    - An error
  answer: '0'
  explanation: COUNT(column) ignores NULLs. COUNT(*) would give 1.
- id: q4
  question: Why can a condition on the right table in WHERE break a LEFT JOIN?
  options:
    - Unmatched rows have NULL there, so the WHERE removes them - like an inner join
    - WHERE is not allowed with joins
    - It makes the query slower only
    - It doubles the rows
  answer: Unmatched rows have NULL there, so the WHERE removes them - like an inner join
  explanation: Put such conditions in the ON clause to keep all left rows.
- id: q5
  question: Which join returns every combination of rows from two tables?
  options:
    - CROSS JOIN
    - LEFT JOIN
    - INNER JOIN
    - FULL OUTER JOIN
  answer: CROSS JOIN
  explanation: 3 sizes × 2 colours = 6 rows.
- id: q6
  question: What does COALESCE(SUM(amount), 0) do?
  options:
    - Returns 0 instead of NULL when there were no amounts to add
    - Adds 0 to every amount
    - Counts the amounts
    - Removes duplicate amounts
  answer: Returns 0 instead of NULL when there were no amounts to add
  explanation: SUM of no rows is NULL; COALESCE swaps it for the fallback.
```
