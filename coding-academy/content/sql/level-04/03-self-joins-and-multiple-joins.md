---
id: sql-4-3-self-joins-and-multiple-joins
title: Self-joins, many-to-many and duplicate traps
track: sql
level: 4
order: 3
minutes: 45
summary: Join a table to itself (employees and their managers), work with many-to-many relationships through junction tables, and avoid double counting when joins multiply rows.
objectives:
  - Join a table to itself using two different aliases
  - Navigate a many-to-many relationship through a junction table
  - Recognise when a join multiplies rows ("fan-out") and avoid double counting
  - Combine several INNER and LEFT joins in one query
prerequisites: [sql-4-2-left-join-and-nulls]
tags: [self join, hierarchy, manager, many-to-many, junction table, bridge table, fan-out, duplicates, double counting, distinct, multiple joins]
---

## Simple explanation

**Self-join**: sometimes a table points at **itself**. In the Company database, `employees.manager_id` holds
the `id` of another employee. To show each employee next to their manager's name, join `employees` to
`employees`, using two aliases as if they were two different tables:

```sql
SELECT e.first_name AS employee, m.first_name AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id;
```

`e` plays "the employee", `m` plays "the manager". LEFT JOIN keeps the CEO, who has no manager.

**Many-to-many**: an employee can work on many projects, and a project has many employees. The
`project_assignments` table (a **junction** table) links them - one row per employee-project pair.

## Real-world analogy

A self-join is like a **class photo with a "best friend" column**: to write the friend's name next to each
child, you look the friend up **in the same photo list**. A junction table is the **sign-up sheet** that links
students and clubs: each line says "this student is in this club".

## Technical definition

- **Self-join**: the same table appears twice with different aliases; the ON condition links them
  (`m.id = e.manager_id`). Hierarchies, "pairs of rows in the same table" (customers in the same city) and
  "compare a row with another row" all use it.
- **Many-to-many**: `A ← junction → B`, e.g. `employees ← project_assignments → projects`. Join A to the
  junction table, then the junction table to B.
- **Fan-out**: joining a "one" row to "many" rows repeats the "one" row's values. Summing a column of the "one"
  side after such a join **double counts** (e.g. a department budget repeated for every employee).
  Fixes: aggregate the "many" side first (in a subquery/CTE) and then join; or sum only columns of the most
  detailed table; `COUNT(DISTINCT ...)` for counts.
- Join order doesn't change INNER JOIN results, but LEFT JOINs must keep the "must keep all" table on the left.

## Step-by-step examples

**Example 1 - employee, department and manager** (Company)

```sql
SELECT e.first_name || ' ' || e.last_name AS employee,
       d.name AS department,
       m.first_name || ' ' || m.last_name AS manager
FROM employees AS e
LEFT JOIN departments AS d ON d.id = e.department_id      -- contractors have no department
LEFT JOIN employees  AS m ON m.id = e.manager_id;          -- the CEO has no manager
```

**Example 2 - many-to-many: who works on which project**

```sql
SELECT p.name AS project, e.first_name, a.role, a.hours
FROM project_assignments AS a
JOIN employees AS e ON e.id = a.employee_id
JOIN projects  AS p ON p.id = a.project_id
ORDER BY p.name, a.hours DESC;
```

**Example 3 - the double-counting trap**

```sql
-- WRONG: each department's budget is repeated once per employee
SELECT SUM(d.budget)
FROM departments AS d
JOIN employees AS e ON e.department_id = d.id;

-- RIGHT: budgets come from the departments table alone
SELECT SUM(budget) FROM departments;
```

**Example 4 - count distinct things after a fan-out**

```sql
SELECT d.name, COUNT(DISTINCT a.employee_id) AS people_on_projects, COUNT(*) AS assignments
FROM departments AS d
JOIN projects AS p ON p.department_id = d.id
JOIN project_assignments AS a ON a.project_id = p.id
GROUP BY d.name;
```

## Common mistakes

- **Same alias twice** or no aliases in a self-join - SQL can't tell the two copies apart.
- **Joining the wrong way round** in a hierarchy: `m.id = e.manager_id` (manager of e) vs `e.id = m.manager_id`
  (people managed by m).
- **INNER JOIN in a self-join** drops the top of the hierarchy (the CEO) - use LEFT JOIN when everyone must appear.
- **Summing a "one-side" column after joining to the "many" side** - double counting.
- **Using DISTINCT to hide a bad join** - fix the join; DISTINCT can hide real duplicates and wrong totals.

## Practical application

Org charts, "who reports to whom", referral programmes (customer referred by customer), category trees, and
"find pairs" problems (duplicates in a table, customers in the same city) are self-joins. Students-courses,
orders-products, employees-projects, tags-articles are many-to-many. Double counting after joins is one of the
most common causes of wrong numbers in real reports - always ask "what does one row represent after my joins?".

## Revision notes

- Self-join: same table, two aliases, ON links them (`m.id = e.manager_id`).
- Many-to-many goes through a junction table: A → junction → B.
- After a join, know what one row means; summing repeated values double counts.
- Aggregate first, then join; or use `COUNT(DISTINCT ...)`.

```exercise
id: employee-manager
title: Employees and their managers
difficulty: beginner
dataset: company
instructions: |
  Show every employee's `first_name` and `last_name` with their manager's first name (column **manager**). The
  CEO (no manager) must appear with NULL. Sort by the employee's `id`.
starter: |
  SELECT e.first_name, e.last_name, e.manager_id
  FROM employees AS e
  ORDER BY e.id;
hints:
  - "Join employees to itself: `LEFT JOIN employees AS m ON m.id = e.manager_id`."
  - "Select `m.first_name AS manager`."
solution: |
  SELECT e.first_name, e.last_name, m.first_name AS manager
  FROM employees AS e
  LEFT JOIN employees AS m ON m.id = e.manager_id
  ORDER BY e.id;
explanation: |
  `m` is a second copy of the employees table playing the role of "manager". LEFT JOIN keeps the CEO even though
  there is no matching manager row.
check:
  ordered: true
  columns: true
```

```exercise
id: project-team
title: Who works on the Mobile App?
difficulty: beginner
dataset: company
instructions: |
  List the people assigned to the project **Mobile App**: their `first_name`, `last_name`, `role` and `hours`,
  most hours first (ties by last name).
starter: |
  SELECT employee_id, role, hours
  FROM project_assignments
  WHERE project_id = 2;
hints:
  - "Start from `project_assignments AS a`, join `employees AS e ON e.id = a.employee_id` and `projects AS p ON p.id = a.project_id`."
  - "Filter by name, not number: `WHERE p.name = 'Mobile App'`."
  - "`ORDER BY a.hours DESC, e.last_name`"
solution: |
  SELECT e.first_name, e.last_name, a.role, a.hours
  FROM project_assignments AS a
  JOIN employees AS e ON e.id = a.employee_id
  JOIN projects AS p ON p.id = a.project_id
  WHERE p.name = 'Mobile App'
  ORDER BY a.hours DESC, e.last_name;
explanation: |
  The junction table links employees and projects; joining both sides turns ids into names. Filtering by the
  project's name is clearer than relying on its id.
check:
  ordered: true
```

```exercise
id: team-sizes
title: Manager team sizes
difficulty: intermediate
dataset: company
instructions: |
  For every employee who manages **at least one** person, show the manager's `first_name`, `last_name` and the
  number of **direct reports** (column **reports**). Sort by `reports` descending, then last name, then first
  name.
starter: |
  SELECT manager_id, COUNT(*) AS reports
  FROM employees
  GROUP BY manager_id;
hints:
  - "Join each employee `e` to their manager `m`: `JOIN employees AS m ON m.id = e.manager_id` (an INNER JOIN drops the CEO's NULL)."
  - "Group by the manager: `GROUP BY m.id, m.first_name, m.last_name` and count rows."
solution: |
  SELECT m.first_name, m.last_name, COUNT(*) AS reports
  FROM employees AS e
  JOIN employees AS m ON m.id = e.manager_id
  GROUP BY m.id, m.first_name, m.last_name
  ORDER BY reports DESC, m.last_name, m.first_name;
explanation: |
  Each row of the join is one (employee, manager) pair, so counting rows per manager gives the number of direct
  reports. Grouping by `m.id` keeps two managers with the same name apart.
check:
  ordered: true
  columns: true
```

```exercise
id: department-project-hours
title: Hours per department without double counting
difficulty: challenge
dataset: company
instructions: |
  For each department that owns projects, show the department `name` (column **department**), the number of
  projects it owns (column **projects**), the number of **different** people working on those projects (column
  **people**) and the total assigned `hours` (column **hours**). Sort by hours, highest first.

  Careful: after joining projects to assignments, each project appears once per assignment.
starter: |
  SELECT d.name AS department, COUNT(*) AS projects, COUNT(*) AS people, SUM(a.hours) AS hours
  FROM departments AS d
  JOIN projects AS p ON p.department_id = d.id
  JOIN project_assignments AS a ON a.project_id = p.id
  GROUP BY d.name
  ORDER BY hours DESC;
hints:
  - "After the joins, one row = one assignment. `COUNT(*)` counts assignments, not projects or people."
  - "Use `COUNT(DISTINCT p.id)` for projects and `COUNT(DISTINCT a.employee_id)` for people."
  - "`SUM(a.hours)` is fine: hours belong to the assignment rows themselves."
solution: |
  SELECT d.name AS department,
         COUNT(DISTINCT p.id) AS projects,
         COUNT(DISTINCT a.employee_id) AS people,
         SUM(a.hours) AS hours
  FROM departments AS d
  JOIN projects AS p ON p.department_id = d.id
  JOIN project_assignments AS a ON a.project_id = p.id
  GROUP BY d.name
  ORDER BY hours DESC;
explanation: |
  The joins fan out to one row per assignment. Hours live on those rows, so summing them is correct; projects and
  people repeat, so they need COUNT(DISTINCT ...). Projects with no assignments wouldn't be counted here -
  a LEFT JOIN to assignments would include them.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What is needed to join a table to itself?
  options:
    - Two different aliases for the same table
    - A second copy of the database
    - The SELF JOIN keyword
    - A UNION
  answer: Two different aliases for the same table
  explanation: e.g. employees AS e and employees AS m.
- id: q2
  question: In `FROM employees e JOIN employees m ON m.id = e.manager_id`, what does m represent?
  options:
    - The manager of employee e
    - The employees managed by e
    - A random employee
    - The department
  answer: The manager of employee e
  explanation: m's id equals e's manager_id.
- id: q3
  question: What is a junction (bridge) table?
  options:
    - A table that links two tables in a many-to-many relationship
    - A table with no rows
    - A copy of a table
    - A table that joins itself
  answer: A table that links two tables in a many-to-many relationship
  explanation: project_assignments links employees and projects.
- id: q4
  question: Why can SUM(d.budget) be wrong after joining departments to employees?
  options:
    - Each department's budget is repeated once per employee, so it's counted many times
    - SUM doesn't work with joins
    - budget is a text column
    - Departments without employees are counted twice
  answer: Each department's budget is repeated once per employee, so it's counted many times
  explanation: That is the fan-out / double-counting trap.
- id: q5
  question: Which function counts each project only once after a fan-out join?
  options:
    - COUNT(DISTINCT p.id)
    - COUNT(*)
    - SUM(p.id)
    - MAX(p.id)
  answer: COUNT(DISTINCT p.id)
  explanation: DISTINCT removes the repeats before counting.
- id: q6
  question: Why use LEFT JOIN for the manager in an employee list?
  options:
    - So the CEO, who has no manager, still appears
    - LEFT JOIN is faster
    - INNER JOIN can't join a table to itself
    - To sort the rows
  answer: So the CEO, who has no manager, still appears
  explanation: An INNER JOIN drops rows whose manager_id is NULL.
```
