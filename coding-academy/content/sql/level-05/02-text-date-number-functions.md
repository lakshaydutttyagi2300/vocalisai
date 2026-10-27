---
id: sql-5-2-text-date-number-functions
title: Text, date and number functions
track: sql
level: 5
order: 2
minutes: 45
summary: Clean and reshape text, work with dates stored as text, and calculate safely with numbers - plus how these functions differ between SQLite, PostgreSQL, MySQL and SQL Server.
objectives:
  - Clean text with TRIM, UPPER, LOWER, REPLACE and SUBSTR
  - Join text with || and find positions with INSTR
  - Extract parts of dates and do date arithmetic with date(), strftime() and julianday()
  - Round, convert and calculate with ROUND, ABS, CAST and avoid integer division
  - Know the equivalent functions in other databases
prerequisites: [sql-5-1-case-and-conditional-aggregation]
tags: [functions, string, text, upper, lower, trim, substr, replace, instr, length, concatenate, "||", date, strftime, julianday, date arithmetic, round, abs, cast, integer division]
---

## Simple explanation

SQL has built-in **functions** that transform values row by row:

```sql
SELECT UPPER('leeds'),                    -- LEEDS
       TRIM('  Berlin  '),                -- Berlin
       'Ada' || ' ' || 'Lovelace',        -- Ada Lovelace   (|| joins text)
       LENGTH('hello'),                   -- 5
       SUBSTR('2026-03-15', 1, 7),        -- 2026-03        (start at 1, take 7)
       ROUND(2.678, 1),                   -- 2.7
       date('2026-03-15', '+10 days');    -- 2026-03-25
```

SQLite has **no separate date type**: dates are text like `'2026-03-15'`. Its date functions understand that
format, so keep dates as `YYYY-MM-DD` and they sort, compare and calculate correctly.

## Real-world analogy

Functions are **kitchen tools** applied to each ingredient as it passes: a peeler (TRIM), a label maker (UPPER),
scissors (SUBSTR), glue (||), a calendar (date functions) and scales that round to the nearest gram (ROUND).

## Technical definition

**Text** (SQLite): `LENGTH(s)`, `UPPER(s)`, `LOWER(s)`, `TRIM(s)` / `LTRIM` / `RTRIM` (also `TRIM(s, 'x')` for
other characters), `SUBSTR(s, start, length)` (1-based), `REPLACE(s, find, replace_with)`, `INSTR(s, find)`
(position, 0 if absent), `s1 || s2` (concatenate), `LIKE` patterns, `printf('%.2f', x)` / `format()`.

**Dates** (SQLite):
- `date('now')`, `date(d, '+1 month')`, `date(d, 'start of month')`, `date(d, '-7 days')`.
- `strftime('%Y', d)` year, `'%m'` month, `'%d'` day, `'%Y-%m'` year-month, `'%w'` weekday (0 = Sunday),
  `'%W'` week number.
- `julianday(d2) - julianday(d1)` = number of days between two dates.

**Numbers**: `ROUND(x, n)`, `ABS(x)`, `CAST(x AS INTEGER / REAL / TEXT)`, `MAX(a, b)` / `MIN(a, b)` with two
arguments (scalar), `%` remainder. **Integer division**: `7 / 2 = 3` - make one side REAL (`7.0 / 2`).

**Other databases** (same ideas, different names):

| Task | SQLite | PostgreSQL | MySQL | SQL Server |
|---|---|---|---|---|
| join text | `a \|\| b` | `a \|\| b`, `CONCAT` | `CONCAT(a, b)` | `a + b`, `CONCAT` |
| part of text | `SUBSTR` | `SUBSTRING` | `SUBSTRING` | `SUBSTRING` |
| position | `INSTR` | `POSITION`/`STRPOS` | `INSTR`/`LOCATE` | `CHARINDEX` |
| year of date | `strftime('%Y', d)` | `EXTRACT(YEAR FROM d)` | `YEAR(d)` | `YEAR(d)` |
| add days | `date(d, '+7 days')` | `d + INTERVAL '7 days'` | `DATE_ADD(d, INTERVAL 7 DAY)` | `DATEADD(day, 7, d)` |
| days between | `julianday(b) - julianday(a)` | `b - a` | `DATEDIFF(b, a)` | `DATEDIFF(day, a, b)` |
| today | `date('now')` | `CURRENT_DATE` | `CURDATE()` | `CAST(GETDATE() AS date)` |

## Step-by-step examples

**Example 1 - cleaning messy text** (Quality)

```sql
SELECT id,
       TRIM(city) AS city,
       LOWER(TRIM(email)) AS email
FROM customers_raw;
```

**Example 2 - email domains** (Shop)

```sql
SELECT email, SUBSTR(email, INSTR(email, '@') + 1) AS domain
FROM customers
WHERE email IS NOT NULL;
```

**Example 3 - monthly totals** (Expenses)

```sql
SELECT strftime('%Y-%m', tx_date) AS month,
       ROUND(SUM(amount), 2) AS net
FROM transactions
GROUP BY month
ORDER BY month;
```

**Example 4 - days between dates**

```sql
SELECT id, signup_date,
       CAST(julianday('2026-06-30') - julianday(signup_date) AS INTEGER) AS days_as_customer
FROM customers;
```

## Common mistakes

- **Dates in other formats** (`'15/03/2026'`) - SQLite's date functions return NULL. Store `YYYY-MM-DD`.
- **SUBSTR starting at 0** - SQL counts from 1.
- **Integer division** in averages and percentages - multiply by `1.0`.
- **`+` to join text in SQLite** - it tries to add numbers (`'a' + 'b'` = 0). Use `||`.
- **Comparing text case-sensitively by accident** - `'London' = 'london'` is false; compare `LOWER(...)`.
- **Using `date('now')` in saved answers or reports** - results change every day; use a fixed date when you need
  repeatable results.

## Practical application

Real data is messy: spaces around names, inconsistent capital letters, phone numbers in different formats.
Functions let you clean it in the query (or in an UPDATE). Dates drive most business reports - sales per month,
weekday patterns, days to deliver, customer age - and they're where SQL dialects differ the most, so keep the
comparison table handy when you move to PostgreSQL or MySQL.

## Revision notes

- Text: `TRIM`, `UPPER/LOWER`, `SUBSTR(s, start, len)`, `REPLACE`, `INSTR`, `LENGTH`, `||`.
- Dates (SQLite): text `YYYY-MM-DD`; `date(d, '+n days')`, `strftime('%Y-%m', d)`, `julianday` differences.
- Numbers: `ROUND`, `ABS`, `CAST`; avoid integer division with `1.0 *`.
- Other databases use different names - same ideas.

```exercise
id: clean-emails
title: Clean up email addresses
difficulty: beginner
dataset: quality
instructions: |
  Show the `id` and a cleaned email (column **email_clean**: spaces removed from both ends and everything in
  lower case) for every customer that **has** an email. Sort by `id`.
starter: |
  SELECT id, email
  FROM customers_raw
  ORDER BY id;
hints:
  - "Functions can be nested: `LOWER(TRIM(email))`."
  - "Skip missing emails with `WHERE email IS NOT NULL`."
solution: |
  SELECT id, LOWER(TRIM(email)) AS email_clean
  FROM customers_raw
  WHERE email IS NOT NULL
  ORDER BY id;
explanation: |
  TRIM runs first (inside), then LOWER. Making emails consistent is the first step before finding duplicates -
  `BEN.SILVA9@...` and `ben.silva9@...` are the same address.
check:
  ordered: true
  columns: true
```

```exercise
id: name-and-domain
title: Full names and email domains
difficulty: beginner
dataset: shop
instructions: |
  For customers with an email, show **full_name** (first name, a space, last name) and **domain** (everything
  after the `@` in the email). Sort by `id`.
starter: |
  SELECT first_name, last_name, email
  FROM customers
  WHERE email IS NOT NULL
  ORDER BY id;
hints:
  - "`first_name || ' ' || last_name AS full_name`"
  - "`INSTR(email, '@')` gives the position of the @; `SUBSTR(email, INSTR(email, '@') + 1)` takes everything after it."
solution: |
  SELECT first_name || ' ' || last_name AS full_name,
         SUBSTR(email, INSTR(email, '@') + 1) AS domain
  FROM customers
  WHERE email IS NOT NULL
  ORDER BY id;
explanation: |
  `SUBSTR` with no length takes the rest of the text. Starting one character after the `@` gives the domain.
check:
  ordered: true
  columns: true
```

```exercise
id: monthly-income-spending
title: Monthly income and spending
difficulty: intermediate
dataset: expenses
instructions: |
  For each month of **2026** (column **month** in the form `2026-01`), show **income** (sum of positive amounts),
  **spending** (sum of negative amounts, shown as a positive number) and **net** (income minus spending). Round
  all three to 2 decimals. Sort by month.
starter: |
  SELECT tx_date, amount
  FROM transactions
  WHERE tx_date >= '2026-01-01';
hints:
  - "`strftime('%Y-%m', tx_date) AS month` and `GROUP BY month`."
  - "Conditional sums: `SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)`; for spending use `-amount` for negative rows."
  - "net is simply `ROUND(SUM(amount), 2)`."
solution: |
  SELECT strftime('%Y-%m', tx_date) AS month,
         ROUND(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 2) AS income,
         ROUND(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 2) AS spending,
         ROUND(SUM(amount), 2) AS net
  FROM transactions
  WHERE tx_date >= '2026-01-01'
  GROUP BY month
  ORDER BY month;
explanation: |
  strftime turns each date into its month label, GROUP BY gathers the month's transactions, and the CASE
  expressions split them into money in and money out.
check:
  ordered: true
  columns: true
```

```exercise
id: days-to-first-order
title: Days from sign-up to first order
difficulty: challenge
dataset: shop
instructions: |
  For each customer who has ordered, show `id`, `signup_date`, **first_order** (their earliest `order_date`) and
  **days_to_first_order** (whole days between sign-up and first order, as an integer). Add a column
  **data_check** that says `'order before signup'` when the number is negative and `'ok'` otherwise. Show the 5 customers with
  the **smallest** number of days (ties by `id`).
starter: |
  SELECT c.id, c.signup_date, MIN(o.order_date) AS first_order
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
  GROUP BY c.id, c.signup_date;
hints:
  - "`CAST(julianday(MIN(o.order_date)) - julianday(c.signup_date) AS INTEGER) AS days_to_first_order`"
  - "`CASE WHEN julianday(MIN(o.order_date)) < julianday(c.signup_date) THEN 'order before signup' ELSE 'ok' END AS data_check`"
  - "`ORDER BY days_to_first_order, c.id LIMIT 5`"
solution: |
  SELECT c.id, c.signup_date,
         MIN(o.order_date) AS first_order,
         CAST(julianday(MIN(o.order_date)) - julianday(c.signup_date) AS INTEGER) AS days_to_first_order,
         CASE WHEN MIN(o.order_date) < c.signup_date THEN 'order before signup' ELSE 'ok' END AS data_check
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
  GROUP BY c.id, c.signup_date
  ORDER BY days_to_first_order, c.id
  LIMIT 5;
explanation: |
  One customer's first order is 66 days *before* they signed up - impossible in real life, so it's a data quality
  problem worth reporting. Date arithmetic is a great way to find such issues. Comparing the date texts directly
  works too, because `YYYY-MM-DD` text sorts in date order.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What does SUBSTR('2026-03-15', 6, 2) return?
  options:
    - '03'
    - '20'
    - '15'
    - '-0'
  answer: '03'
  explanation: Start at character 6 and take 2 characters. SQL counts from 1.
- id: q2
  question: How do you join first_name and last_name with a space in SQLite?
  options:
    - first_name || ' ' || last_name
    - first_name + ' ' + last_name
    - JOIN(first_name, last_name)
    - first_name & last_name
  answer: first_name || ' ' || last_name
  explanation: In SQLite, + adds numbers; || joins text. SQL Server uses + for text.
- id: q3
  question: Which SQLite expression gives the year-month, like 2026-03, of a date?
  options:
    - strftime('%Y-%m', d)
    - YEAR(d)
    - EXTRACT(MONTH FROM d)
    - date(d, 'month')
  answer: strftime('%Y-%m', d)
  explanation: SUBSTR(d, 1, 7) also works for YYYY-MM-DD text.
- id: q4
  question: How do you get the number of days between two dates in SQLite?
  options:
    - julianday(later) - julianday(earlier)
    - later - earlier
    - DATEDIFF(later, earlier)
    - days(later, earlier)
  answer: julianday(later) - julianday(earlier)
  explanation: julianday converts a date to a number of days; subtracting gives the difference.
- id: q5
  question: Why might date('15/03/2026') return NULL in SQLite?
  options:
    - SQLite's date functions expect YYYY-MM-DD format
    - March has no 15th
    - Dates must be numbers
    - date() needs two arguments
  answer: SQLite's date functions expect YYYY-MM-DD format
  explanation: Store dates as 'YYYY-MM-DD' text.
- id: q6
  question: What does TRIM('  Berlin ') return?
  options:
    - "'Berlin'"
    - "'  Berlin'"
    - "'BERLIN'"
    - "'Berlin '"
  answer: "'Berlin'"
  explanation: TRIM removes spaces from both ends; LTRIM and RTRIM do one side.
```
