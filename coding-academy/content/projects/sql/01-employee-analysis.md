---
id: proj-sql-01-employee-analysis
title: Employee analysis for HR
track: sql
order: 1
difficulty: beginner
summary: Answer the HR team's questions about headcount, salaries, managers and pay growth using the Company database.
dataset: company
internet: false
skills: [sql-2-2-group-by-having, sql-4-1-inner-join, sql-4-3-self-joins-and-multiple-joins, sql-5-1-case-and-conditional-aggregation, sql-6-2-lag-lead-running-totals]
stages:
  - name: Beginner
    description: Headcount and pay basics.
    tasks:
      - {id: b1, text: "Headcount per department (with the department name), largest first"}
      - {id: b2, text: "Average, lowest and highest salary per department, rounded"}
      - {id: b3, text: "List the contractors (employees without a department)"}
  - name: Intermediate
    description: Structure and history.
    tasks:
      - {id: i1, text: "Each employee with their manager's full name (the CEO shows 'no manager')"}
      - {id: i2, text: "Salary bands (under 60k, 60-100k, over 100k) with a count per department (one column per band)"}
      - {id: i3, text: "Each employee's total pay growth since their first salary record, as a percentage, top 10"}
      - {id: i4, text: "Employees hired in each year, with a running total of headcount"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Find employees paid more than their own manager"}
      - {id: e2, text: "Compare each department's salary bill with its budget"}
      - {id: e3, text: "Write a short summary (3-5 sentences) of what HR should know"}
---

## Goal

You're the analyst HR asks every week. Write one query per question, run each in the SQL Lab on the **company**
database, and check the results make sense (does the headcount add up to the number of employees?).

## The questions

1. How many people work in each department? Which department is biggest?
2. What do salaries look like per department (average, min, max)?
3. Who are the contractors?
4. Who reports to whom?
5. How are salaries spread across bands in each department?
6. Whose pay has grown the most since they joined?
7. How has headcount grown year by year?

## Hints

- Department names: `JOIN departments AS d ON d.id = e.department_id`.
- Contractors: `WHERE department_id IS NULL`.
- Managers: self-join with LEFT JOIN, `COALESCE(m.first_name || ' ' || m.last_name, 'no manager')`.
- Bands: `SUM(CASE WHEN salary < 60000 THEN 1 ELSE 0 END) AS under_60k`, etc.
- Pay growth: first salary via a CTE with `MIN(effective_date)` or `FIRST_VALUE`; compare with the current
  `employees.salary`.
- Hires per year: `strftime('%Y', hire_date)`; running total: `SUM(COUNT(*)) OVER (ORDER BY year)`.

## Sample solution

```sql
-- 1. Headcount per department
SELECT d.name AS department, COUNT(*) AS headcount
FROM employees AS e
JOIN departments AS d ON d.id = e.department_id
GROUP BY d.name
ORDER BY headcount DESC;
```

```sql
-- 2. Salary statistics per department
SELECT d.name AS department,
       ROUND(AVG(e.salary)) AS avg_salary, MIN(e.salary) AS lowest, MAX(e.salary) AS highest
FROM employees AS e
JOIN departments AS d ON d.id = e.department_id
GROUP BY d.name
ORDER BY avg_salary DESC;
```

```sql
-- 3. Contractors
SELECT first_name, last_name, job_title, salary
FROM employees
WHERE department_id IS NULL;
```

```sql
-- 4. Employees and managers
SELECT e.first_name || ' ' || e.last_name AS employee,
       COALESCE(m.first_name || ' ' || m.last_name, 'no manager') AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id
ORDER BY manager, employee;
```

```sql
-- 5. Salary bands per department (a pivot)
SELECT COALESCE(d.name, 'Contractors') AS department,
       SUM(CASE WHEN e.salary < 60000 THEN 1 ELSE 0 END) AS under_60k,
       SUM(CASE WHEN e.salary BETWEEN 60000 AND 100000 THEN 1 ELSE 0 END) AS from_60k_to_100k,
       SUM(CASE WHEN e.salary > 100000 THEN 1 ELSE 0 END) AS over_100k
FROM employees AS e
LEFT JOIN departments AS d ON d.id = e.department_id
GROUP BY department
ORDER BY department;
```

```sql
-- 6. Pay growth since the first salary record, top 10
WITH first_salary AS (
    SELECT employee_id, salary AS first_salary
    FROM salary_history AS sh
    WHERE effective_date = (SELECT MIN(effective_date) FROM salary_history
                            WHERE employee_id = sh.employee_id)
)
SELECT e.first_name, e.last_name, f.first_salary, e.salary AS current_salary,
       ROUND(100.0 * (e.salary - f.first_salary) / f.first_salary, 1) AS growth_pct
FROM employees AS e
JOIN first_salary AS f ON f.employee_id = e.id
ORDER BY growth_pct DESC, e.id
LIMIT 10;
```

```sql
-- 7. Hires per year with a running total
SELECT strftime('%Y', hire_date) AS year,
       COUNT(*) AS hired,
       SUM(COUNT(*)) OVER (ORDER BY strftime('%Y', hire_date)) AS headcount_so_far
FROM employees
GROUP BY year
ORDER BY year;
```

## Check your work

The headcounts in question 1 plus the contractors in question 3 should equal `SELECT COUNT(*) FROM employees`.
The bands in question 5 should add up to the same number.
