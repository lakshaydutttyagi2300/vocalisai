---
id: sql-6-3-recursive-ctes-and-decomposition
title: Recursive queries and breaking down hard problems
track: sql
level: 6
order: 3
minutes: 50
summary: Generate sequences and calendars, walk hierarchies such as org charts with WITH RECURSIVE, and use a step-by-step method to turn a difficult business question into a correct query.
objectives:
  - Explain the anchor and recursive parts of a recursive CTE
  - Generate number and date sequences
  - Walk a hierarchy (manager → reports) and compute levels and paths
  - Fill gaps in time series with a generated calendar
  - Decompose a complex question into small, testable CTE steps
prerequisites: [sql-5-4-ctes-and-set-operations, sql-4-3-self-joins-and-multiple-joins]
tags: [recursive cte, with recursive, hierarchy, tree, org chart, sequence, calendar, date series, gaps, decomposition, problem solving]
---

## Simple explanation

A **recursive CTE** is a CTE that refers to **itself**. It has two parts joined by `UNION ALL`:

```sql
WITH RECURSIVE numbers(n) AS (
    SELECT 1                 -- anchor: where to start
    UNION ALL
    SELECT n + 1             -- recursive step: build the next row from the previous one
    FROM numbers
    WHERE n < 5              -- stop condition
)
SELECT n FROM numbers;       -- 1, 2, 3, 4, 5
```

SQL runs the anchor, then repeatedly runs the recursive part on the rows it just produced, until it produces no
new rows.

The same idea walks **hierarchies**: start with the boss (anchor), then repeatedly find the people whose manager
is someone already found (recursive step).

## Real-world analogy

A recursive CTE is a **family tree** being drawn: write down the grandparent (anchor), then their children, then
the children's children - each generation found from the previous one - until a generation has no children.

## Technical definition

- `WITH RECURSIVE name(columns) AS (anchor_query UNION ALL recursive_query) SELECT ...`.
- The recursive query must reference `name` once, usually in FROM/JOIN, and must eventually return no rows
  (a WHERE stop condition, or the data runs out). An infinite recursion runs until the database stops it - in
  this app the query time limit stops it.
- Typical uses: number/date series, calendars, org charts and category trees (levels, paths, all descendants),
  bill-of-materials, graph walks (with a depth limit to avoid cycles).
- Build a path text with `path || ' > ' || name`; track depth with `level + 1`.
- Supported in SQLite, PostgreSQL, MySQL 8+ (`WITH RECURSIVE`); SQL Server writes just `WITH`.
- **Decomposition method** for hard questions:
  1. Write the question in plain words and decide what **one output row** means.
  2. List the tables and keys needed.
  3. Build step 1 as a CTE and **run it alone**; check row counts and a few values.
  4. Add the next CTE that uses the previous one; check again.
  5. Write the final SELECT; sanity-check totals against a simple query.

## Step-by-step examples

**Example 1 - every day in a month** (any database)

```sql
WITH RECURSIVE days(day) AS (
    SELECT '2026-06-01'
    UNION ALL
    SELECT date(day, '+1 day') FROM days WHERE day < '2026-06-30'
)
SELECT day FROM days;
```

**Example 2 - the org chart with levels and paths** (Company)

```sql
WITH RECURSIVE chart(id, name, level, path) AS (
    SELECT id, first_name, 0, first_name
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.first_name, c.level + 1, c.path || ' > ' || e.first_name
    FROM employees AS e
    JOIN chart AS c ON e.manager_id = c.id
)
SELECT * FROM chart ORDER BY path;
```

**Example 3 - filling gaps: spending on every day, including zero days** (Expenses)

```sql
WITH RECURSIVE days(day) AS (
    SELECT '2026-06-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2026-06-30'
)
SELECT d.day, ROUND(COALESCE(-SUM(t.amount), 0), 2) AS spent
FROM days AS d
LEFT JOIN transactions AS t ON t.tx_date = d.day AND t.amount < 0
GROUP BY d.day;
```

**Example 4 - decomposition in action**: "Which department's projects have the most hours per assignment?"

```sql
WITH hours_per_project AS (            -- step 1: one row per project
    SELECT project_id, SUM(hours) AS hours, COUNT(*) AS people
    FROM project_assignments GROUP BY project_id
),
per_department AS (                    -- step 2: one row per department
    SELECT p.department_id, SUM(h.hours) AS hours, SUM(h.people) AS assignments
    FROM hours_per_project h JOIN projects p ON p.id = h.project_id
    GROUP BY p.department_id
)
SELECT d.name, ROUND(1.0 * hours / assignments, 1) AS hours_per_assignment   -- step 3: answer
FROM per_department pd JOIN departments d ON d.id = pd.department_id
ORDER BY hours_per_assignment DESC;
```

## Common mistakes

- **No stop condition** - the recursion never ends (until the time limit).
- **UNION instead of UNION ALL** - works but is slower; UNION ALL is standard in recursion.
- **Joining the wrong way** in a hierarchy (`c.manager_id = e.id` walks upwards instead of downwards).
- **Cycles in data** (A manages B, B manages A) - add a depth limit (`WHERE level < 20`).
- **Writing a giant query in one go** - build and test CTE by CTE.

## Practical application

Calendars for reports without gaps, org charts ("everyone under this director"), category trees in shops
("all products under Electronics, including sub-categories"), and dependency chains are classic recursive tasks.
The decomposition method applies to every hard query you will ever write - and is exactly how professionals
debug wrong numbers.

## Revision notes

- `WITH RECURSIVE x AS (anchor UNION ALL step-using-x WHERE stop) SELECT ...`.
- Sequences: `SELECT n + 1 ... WHERE n < limit`; dates: `date(day, '+1 day')`.
- Hierarchies: anchor = top (or a chosen person); step = join children to found rows; track level/path.
- Fill gaps: LEFT JOIN data onto a generated calendar.
- Decompose: one CTE per step, run and check each step.

```exercise
id: number-series
title: Generate a sequence
difficulty: beginner
dataset: blank
instructions: |
  Use a recursive CTE to produce the **multiples of 5 from 5 to 50** in a column called **n**, smallest first.
starter: |
  WITH RECURSIVE seq(n) AS (
      SELECT 5
  )
  SELECT n FROM seq;
hints:
  - "Add `UNION ALL SELECT n + 5 FROM seq WHERE n < 50` after the anchor."
  - "Finish with `ORDER BY n`."
solution: |
  WITH RECURSIVE seq(n) AS (
      SELECT 5
      UNION ALL
      SELECT n + 5 FROM seq WHERE n < 50
  )
  SELECT n FROM seq ORDER BY n;
explanation: |
  The anchor gives 5; each step adds 5 to the previous row. When n reaches 50, the WHERE stops new rows being
  made, so the series ends at 50.
check:
  ordered: true
  columns: true
```

```exercise
id: reports-of-vp
title: Everyone under a manager
difficulty: intermediate
dataset: company
instructions: |
  List **everyone who reports to Kofi Brown (employee id 2), directly or indirectly** - not Kofi himself. Show
  `id`, `first_name`, `last_name` and **level** (1 = reports directly to Kofi, 2 = reports to one of those, ...).
  Sort by level, then id.
starter: |
  SELECT id, first_name, last_name, 1 AS level
  FROM employees
  WHERE manager_id = 2
  ORDER BY level, id;
hints:
  - "The starter finds only level 1. Make it the anchor of `WITH RECURSIVE team(id, first_name, last_name, level) AS (...)`."
  - "Recursive step: `SELECT e.id, e.first_name, e.last_name, t.level + 1 FROM employees AS e JOIN team AS t ON e.manager_id = t.id`."
  - "Then `SELECT * FROM team ORDER BY level, id`."
solution: |
  WITH RECURSIVE team(id, first_name, last_name, level) AS (
      SELECT id, first_name, last_name, 1
      FROM employees
      WHERE manager_id = 2
      UNION ALL
      SELECT e.id, e.first_name, e.last_name, t.level + 1
      FROM employees AS e
      JOIN team AS t ON e.manager_id = t.id
  )
  SELECT id, first_name, last_name, level
  FROM team
  ORDER BY level, id;
explanation: |
  Each round finds the people managed by someone found in the previous round. The recursion stops by itself when a
  round finds nobody new - the bottom of the tree.
check:
  ordered: true
  columns: true
```

```exercise
id: daily-calendar
title: Daily spending with no gaps
difficulty: intermediate
dataset: expenses
instructions: |
  For every day from **2026-06-01** to **2026-06-14**, show **day** and **spent** (total of negative amounts as a
  positive number, rounded to 2 decimals) - days without spending must show **0**. Sort by day.
starter: |
  SELECT tx_date AS day, ROUND(-SUM(amount), 2) AS spent
  FROM transactions
  WHERE amount < 0 AND tx_date BETWEEN '2026-06-01' AND '2026-06-14'
  GROUP BY tx_date
  ORDER BY day;
hints:
  - "The starter skips days with no spending. Generate the 14 days with `WITH RECURSIVE days(day) AS (SELECT '2026-06-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2026-06-14')`."
  - "`LEFT JOIN transactions AS t ON t.tx_date = d.day AND t.amount < 0` - the amount condition goes in ON to keep empty days."
  - "`ROUND(COALESCE(-SUM(t.amount), 0), 2) AS spent` and `GROUP BY d.day`."
solution: |
  WITH RECURSIVE days(day) AS (
      SELECT '2026-06-01'
      UNION ALL
      SELECT date(day, '+1 day') FROM days WHERE day < '2026-06-14'
  )
  SELECT d.day, ROUND(COALESCE(-SUM(t.amount), 0), 2) AS spent
  FROM days AS d
  LEFT JOIN transactions AS t ON t.tx_date = d.day AND t.amount < 0
  GROUP BY d.day
  ORDER BY d.day;
explanation: |
  The calendar provides one row per day whether or not anything happened; the LEFT JOIN attaches the spending when
  there is some, and COALESCE turns "no rows" (NULL) into 0. Charts and moving averages need these zero days.
check:
  ordered: true
  columns: true
```

```exercise
id: subtree-cost
title: Headcount and salary cost per top manager
difficulty: challenge
dataset: company
instructions: |
  For each of the CEO's **direct reports** (the department heads), show their `first_name` (column **head**),
  the number of people in their **whole team below them** (column **team_size**, not counting the head) and the
  total yearly salary of that team (column **team_salary**). Heads with nobody below them show 0 for both. Sort
  by team_size descending, then head.

  Tip: decompose it - step 1 finds the heads; step 2 walks down from each head, remembering which head each person
  belongs to; step 3 summarises.
starter: |
  WITH heads AS (
      SELECT id, first_name
      FROM employees
      WHERE manager_id = (SELECT id FROM employees WHERE manager_id IS NULL)
  )
  SELECT * FROM heads;
hints:
  - "Step 2: `WITH RECURSIVE ... below(head_id, id, salary) AS (SELECT e.manager_id, e.id, e.salary FROM employees e JOIN heads h ON e.manager_id = h.id UNION ALL SELECT b.head_id, e.id, e.salary FROM employees e JOIN below b ON e.manager_id = b.id)`. Note: RECURSIVE goes right after WITH, before the first CTE."
  - "Step 3: `FROM heads h LEFT JOIN below b ON b.head_id = h.id GROUP BY h.id, h.first_name` with `COUNT(b.id)` and `COALESCE(SUM(b.salary), 0)`."
solution: |
  WITH RECURSIVE heads AS (
      SELECT id, first_name
      FROM employees
      WHERE manager_id = (SELECT id FROM employees WHERE manager_id IS NULL)
  ),
  below(head_id, id, salary) AS (
      SELECT e.manager_id, e.id, e.salary
      FROM employees AS e
      JOIN heads AS h ON e.manager_id = h.id
      UNION ALL
      SELECT b.head_id, e.id, e.salary
      FROM employees AS e
      JOIN below AS b ON e.manager_id = b.id
  )
  SELECT h.first_name AS head,
         COUNT(b.id) AS team_size,
         COALESCE(SUM(b.salary), 0) AS team_salary
  FROM heads AS h
  LEFT JOIN below AS b ON b.head_id = h.id
  GROUP BY h.id, h.first_name
  ORDER BY team_size DESC, head;
explanation: |
  The recursive CTE carries the head's id down the tree unchanged (`b.head_id`), so every person found is labelled
  with the head they ultimately report to. Run `SELECT * FROM below` on its own first - checking each step is the
  heart of query decomposition.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What are the two parts of a recursive CTE?
  options:
    - An anchor query and a recursive query joined by UNION ALL
    - A SELECT and an UPDATE
    - Two tables joined by JOIN
    - A WHERE and a HAVING
  answer: An anchor query and a recursive query joined by UNION ALL
  explanation: The anchor starts; the recursive part builds new rows from the previous ones.
- id: q2
  question: What stops a recursive CTE?
  options:
    - The recursive part producing no new rows (e.g. because of a WHERE condition)
    - Reaching 100 rows automatically
    - The ORDER BY
    - Nothing - it always runs forever
  answer: The recursive part producing no new rows (e.g. because of a WHERE condition)
  explanation: Always make sure the recursion can end.
- id: q3
  question: Which expression gives the day after `day` in SQLite?
  options:
    - date(day, '+1 day')
    - day + 1
    - NEXT(day)
    - day || '+1'
  answer: date(day, '+1 day')
  explanation: day + 1 would treat the text as a number.
- id: q4
  question: "To walk DOWN an org chart from a manager, the recursive step joins on:"
  options:
    - e.manager_id = found.id
    - e.id = found.manager_id
    - e.id = found.id
    - e.salary = found.salary
  answer: e.manager_id = found.id
  explanation: Find employees whose manager is someone already found. The other way walks up.
- id: q5
  question: Why generate a calendar with a recursive CTE before joining sales data?
  options:
    - So days or months with no data still appear (with 0)
    - Because dates can't be grouped
    - To make the query shorter
    - Because LEFT JOIN needs a recursive CTE
  answer: So days or months with no data still appear (with 0)
  explanation: Then LAG, moving averages and charts work correctly.
- id: q6
  question: What is the core idea of query decomposition?
  options:
    - Build the answer in small steps (CTEs), running and checking each step
    - Write the whole query at once and fix errors later
    - Avoid joins
    - Always use subqueries in WHERE
  answer: Build the answer in small steps (CTEs), running and checking each step
  explanation: Decide what one row means at each step and verify row counts.
```
