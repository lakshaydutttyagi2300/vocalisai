---
id: sql-6-2-lag-lead-running-totals
title: LAG, LEAD, running totals and moving averages
track: sql
level: 6
order: 2
minutes: 50
summary: Compare each row with the previous or next one (LAG, LEAD), build running totals and moving averages with window frames, and pick first and last values in a group.
objectives:
  - Compare a row with the previous/next row using LAG and LEAD
  - Calculate running totals with SUM() OVER (ORDER BY ...)
  - Control the window with frames (ROWS BETWEEN ... AND ...)
  - Compute moving averages and month-over-month changes
  - Use FIRST_VALUE and LAST_VALUE correctly
prerequisites: [sql-6-1-ranking-window-functions]
tags: [lag, lead, running total, cumulative sum, moving average, rolling, window frame, rows between, preceding, following, unbounded, first_value, last_value, month over month]
---

## Simple explanation

`LAG(column)` looks at the **previous row** (in the window's order); `LEAD(column)` at the **next** one. That
makes "change since last time" easy:

```sql
SELECT employee_id, effective_date, salary,
       LAG(salary) OVER (PARTITION BY employee_id ORDER BY effective_date) AS previous_salary
FROM salary_history;
```

The first row of each employee has no previous row, so `previous_salary` is NULL there.

A **running total** is a SUM whose window grows row by row:

```sql
SELECT tx_date, amount,
       SUM(amount) OVER (ORDER BY tx_date, id) AS balance
FROM transactions
WHERE account_id = 1;
```

## Real-world analogy

LAG is glancing at **yesterday's page** in a diary to see what changed. A running total is your **bank
balance** after each transaction. A moving average is a **smoothed weight chart** - "average of the last 7 days"
- that ignores daily ups and downs.

## Technical definition

- `LAG(expr [, offset [, default]]) OVER (...)`, `LEAD(expr [, offset [, default]]) OVER (...)` - offset 1 by
  default; `default` replaces NULL at the edges.
- With `ORDER BY` inside `OVER`, aggregate window functions use a **frame**. The default frame is "from the
  start of the partition to the current row (including rows with the same ORDER BY value)" - which is why
  `SUM() OVER (ORDER BY ...)` gives a running total. Ties in the ORDER BY are added together, so add a
  tie-breaker (e.g. `id`) for a row-by-row running total.
- **Explicit frames**: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` (3-row moving window),
  `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (running), `ROWS BETWEEN UNBOUNDED PRECEDING AND
  UNBOUNDED FOLLOWING` (whole partition). `RANGE` frames work on values instead of row counts.
- `FIRST_VALUE(expr)` / `LAST_VALUE(expr)` / `NTH_VALUE(expr, n)` - careful: with the default frame,
  LAST_VALUE is the *current* row; use the whole-partition frame.
- Window functions can be combined with GROUP BY: aggregate first (e.g. monthly totals), then window over the
  grouped rows (`LAG(SUM(x)) OVER (ORDER BY month)`).

## Step-by-step examples

**Example 1 - pay rise in percent** (Company)

```sql
SELECT employee_id, effective_date, salary,
       ROUND(100.0 * (salary - LAG(salary) OVER w) / LAG(salary) OVER w, 1) AS raise_pct
FROM salary_history
WINDOW w AS (PARTITION BY employee_id ORDER BY effective_date);
```

`WINDOW w AS (...)` names a window so you don't repeat it (SQLite, PostgreSQL, MySQL 8).

**Example 2 - monthly revenue and change** (Shop)

```sql
WITH monthly AS (
    SELECT substr(o.order_date, 1, 7) AS month, SUM(i.quantity * i.unit_price) AS revenue
    FROM orders o JOIN order_items i ON i.order_id = o.id
    GROUP BY month
)
SELECT month, ROUND(revenue, 2) AS revenue,
       ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2) AS change
FROM monthly;
```

**Example 3 - 3-month moving average**

```sql
WITH monthly AS (
    SELECT substr(o.order_date, 1, 7) AS month, SUM(i.quantity * i.unit_price) AS revenue
    FROM orders o JOIN order_items i ON i.order_id = o.id
    GROUP BY month
)
SELECT month, ROUND(revenue, 2) AS revenue,
       ROUND(AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3m
FROM monthly;
```

**Example 4 - first salary on record**

```sql
SELECT DISTINCT employee_id,
       FIRST_VALUE(salary) OVER (PARTITION BY employee_id ORDER BY effective_date) AS starting_salary
FROM salary_history;
```

## Common mistakes

- **Missing ORDER BY in OVER for LAG/LEAD** - "previous" has no meaning without an order.
- **Running totals that jump** because several rows share the ORDER BY value - add a tie-breaker.
- **LAST_VALUE returning the current row** - set `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.
- **Forgetting PARTITION BY** - LAG compares one employee's first salary with the previous employee's last one.
- **Missing months** - LAG compares with the previous *row*, not the previous calendar month. If a month has no
  data, generate a calendar first (next lesson).

## Practical application

Month-over-month growth, running account balances, cumulative sales towards a target, days between a customer's
orders (LAG of order_date), first and latest purchase, 7-day moving averages of website visits - all standard
analytics questions, all one window function away.

## Revision notes

- LAG = previous row, LEAD = next row (within PARTITION BY, in ORDER BY order); NULL at the edges.
- `SUM(x) OVER (ORDER BY ...)` = running total; add a tie-breaker.
- Frames: `ROWS BETWEEN n PRECEDING AND CURRENT ROW` for moving windows.
- LAST_VALUE needs a whole-partition frame.
- Aggregate first (CTE), then apply windows to the aggregated rows.

```exercise
id: running-balance
title: A running balance
difficulty: beginner
dataset: expenses
instructions: |
  For account **1** (Current Account) in **January 2026**, show each transaction's `id`, `tx_date`,
  `description`, `amount` and the running total of the amounts so far (column **running_total**, rounded to 2
  decimals), in date order with `id` as the tie-breaker - both in the window and in the final ORDER BY.
starter: |
  SELECT id, tx_date, description, amount
  FROM transactions
  WHERE account_id = 1 AND tx_date BETWEEN '2026-01-01' AND '2026-01-31'
  ORDER BY tx_date, id;
hints:
  - "`SUM(amount) OVER (ORDER BY tx_date, id)` adds up all rows up to the current one."
  - "Wrap it in ROUND(..., 2) and name it running_total."
solution: |
  SELECT id, tx_date, description, amount,
         ROUND(SUM(amount) OVER (ORDER BY tx_date, id), 2) AS running_total
  FROM transactions
  WHERE account_id = 1 AND tx_date BETWEEN '2026-01-01' AND '2026-01-31'
  ORDER BY tx_date, id;
explanation: |
  The window's ORDER BY decides in which order amounts are added. Including `id` means two transactions on the
  same day are added one at a time instead of together.
check:
  ordered: true
  columns: true
```

```exercise
id: salary-changes
title: Each pay rise
difficulty: intermediate
dataset: company
instructions: |
  From `salary_history`, show for employee **2** and employee **3**: `employee_id`, `effective_date`, `salary`,
  the previous salary of the **same** employee (column **previous_salary**) and the increase (column
  **increase**, salary minus previous salary). The first record of each employee has NULLs in both new columns.
  Sort by employee, then date.
starter: |
  SELECT employee_id, effective_date, salary
  FROM salary_history
  WHERE employee_id IN (2, 3)
  ORDER BY employee_id, effective_date;
hints:
  - "`LAG(salary) OVER (PARTITION BY employee_id ORDER BY effective_date) AS previous_salary`"
  - "The increase is `salary - LAG(salary) OVER (...)` with the same window."
solution: |
  SELECT employee_id, effective_date, salary,
         LAG(salary) OVER (PARTITION BY employee_id ORDER BY effective_date) AS previous_salary,
         salary - LAG(salary) OVER (PARTITION BY employee_id ORDER BY effective_date) AS increase
  FROM salary_history
  WHERE employee_id IN (2, 3)
  ORDER BY employee_id, effective_date;
explanation: |
  PARTITION BY employee_id stops employee 3's first salary from being compared with employee 2's last one.
  NULL minus a number is NULL, so the first record's increase is NULL automatically.
check:
  ordered: true
  columns: true
```

```exercise
id: month-over-month
title: Month-over-month revenue
difficulty: intermediate
dataset: shop
instructions: |
  For **delivered** orders, show each month (column **month**, `YYYY-MM`), its revenue (`quantity *
  unit_price`, column **revenue**, rounded to 2 decimals) and the change from the previous month (column
  **change**, rounded to 2 decimals; NULL for the first month). Sort by month.
starter: |
  SELECT substr(o.order_date, 1, 7) AS month,
         ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.id
  WHERE o.status = 'delivered'
  GROUP BY month
  ORDER BY month;
hints:
  - "Put the starter (without ROUND) into a CTE called monthly."
  - "Then `revenue - LAG(revenue) OVER (ORDER BY month)` gives the change."
  - "Round both columns in the final SELECT."
solution: |
  WITH monthly AS (
      SELECT substr(o.order_date, 1, 7) AS month,
             SUM(i.quantity * i.unit_price) AS revenue
      FROM orders AS o
      JOIN order_items AS i ON i.order_id = o.id
      WHERE o.status = 'delivered'
      GROUP BY month
  )
  SELECT month,
         ROUND(revenue, 2) AS revenue,
         ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2) AS change
  FROM monthly
  ORDER BY month;
explanation: |
  Aggregating to one row per month first, then applying LAG, compares each month with the one before it.
  Rounding only at the end keeps the change exact.
check:
  ordered: true
  columns: true
```

```exercise
id: moving-average
title: A 3-month moving average of spending
difficulty: challenge
dataset: expenses
instructions: |
  For each month (column **month**), show total **spending** (negative amounts as a positive number, rounded to 2
  decimals) and the **moving_avg** of spending over that month and the two months before it (rounded to 2
  decimals; for the first two months, average whatever months exist). Sort by month.
starter: |
  SELECT strftime('%Y-%m', tx_date) AS month,
         ROUND(-SUM(amount), 2) AS spending
  FROM transactions
  WHERE amount < 0
  GROUP BY month
  ORDER BY month;
hints:
  - "Put the monthly totals in a CTE."
  - "`AVG(spending) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`"
solution: |
  WITH monthly AS (
      SELECT strftime('%Y-%m', tx_date) AS month,
             -SUM(amount) AS spending
      FROM transactions
      WHERE amount < 0
      GROUP BY month
  )
  SELECT month,
         ROUND(spending, 2) AS spending,
         ROUND(AVG(spending) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg
  FROM monthly
  ORDER BY month;
explanation: |
  The frame `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` makes a window of up to 3 rows that slides down the list.
  At the start there are fewer rows, so the average uses 1 and then 2 months. Moving averages smooth out
  one-off spikes such as a big purchase.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What does LAG(salary) OVER (PARTITION BY employee_id ORDER BY effective_date) return on an employee's first record?
  options:
    - 'NULL'
    - '0'
    - The same salary
    - The previous employee's salary
  answer: 'NULL'
  explanation: There is no previous row in that employee's partition. LAG(salary, 1, 0) would give 0 instead.
- id: q2
  question: Which expression gives a running total of amount in date order?
  options:
    - SUM(amount) OVER (ORDER BY tx_date, id)
    - SUM(amount) GROUP BY tx_date
    - RUNNING(amount)
    - LAG(amount) + amount
  answer: SUM(amount) OVER (ORDER BY tx_date, id)
  explanation: With ORDER BY, the default frame runs from the first row to the current one.
- id: q3
  question: Which frame makes a 3-row moving window?
  options:
    - ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    - ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    - ROWS UNBOUNDED
    - PARTITION BY 3
  answer: ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  explanation: Two rows before plus the current row = 3 rows.
- id: q4
  question: What does LEAD(order_date) give?
  options:
    - The order_date of the next row in the window order
    - The earliest order_date
    - The order_date of the previous row
    - The difference between dates
  answer: The order_date of the next row in the window order
  explanation: LEAD looks forward; LAG looks back.
- id: q5
  question: Why might LAST_VALUE(x) OVER (ORDER BY d) simply return the current row's x?
  options:
    - The default frame ends at the current row; use ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    - LAST_VALUE is broken in SQLite
    - ORDER BY reverses the order
    - It needs GROUP BY
  answer: The default frame ends at the current row; use ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  explanation: The frame decides which rows the function can see.
- id: q6
  question: Your monthly data has no row for March. What does LAG compare April with?
  options:
    - February - the previous row, not the previous calendar month
    - March, filled with zero automatically
    - 'NULL'
    - April of the previous year
  answer: February - the previous row, not the previous calendar month
  explanation: Generate a full calendar first if missing months matter.
```
