---
id: sql-1-3-in-between-like-null
title: IN, BETWEEN, LIKE and NULL
track: sql
level: 1
order: 3
minutes: 40
summary: Powerful filters - match a list of values with IN, a range with BETWEEN, text patterns with LIKE, and missing values with IS NULL.
objectives:
  - Match one of several values with IN (and NOT IN)
  - Filter a range of numbers or dates with BETWEEN
  - Search text patterns with LIKE and the wildcards % and _
  - Find missing values with IS NULL and IS NOT NULL - and explain why = NULL never works
prerequisites: [sql-1-2-where]
tags: [in, between, like, wildcard, null, is null, is not null, pattern]
---

## Simple explanation

Four shortcuts make WHERE much more expressive:

| Tool | Example | Meaning |
|---|---|---|
| `IN (...)` | `country IN ('India', 'UK')` | equal to any value in the list |
| `BETWEEN a AND b` | `price BETWEEN 10 AND 20` | from a to b, **including both ends** |
| `LIKE 'pattern'` | `name LIKE 'Py%'` | text matching a pattern |
| `IS NULL` | `email IS NULL` | the value is missing |

**LIKE wildcards:** `%` means "any number of characters (even none)", `_` means "exactly one character".

**NULL** means "unknown / no value". It is *not* zero and *not* empty text. You **cannot** find it with
`= NULL` - you must write `IS NULL`.

## Real-world analogy

- `IN` is a **guest list**: is this name on the list?
- `BETWEEN` is a **height restriction** at a fairground: from 120 to 200 cm, inclusive.
- `LIKE` is **searching your contacts** by the first few letters.
- `NULL` is a **blank on a form**. A blank is not "0" and not "no" - it is *unknown*. You cannot say "this blank
  equals that blank", you can only say "this field *is* blank".

## Technical definition

- `x IN (v1, v2, ...)` ≡ `x = v1 OR x = v2 OR ...`. `NOT IN` is the opposite (careful: if the list contains
  NULL, `NOT IN` returns no rows).
- `x BETWEEN a AND b` ≡ `x >= a AND x <= b` (inclusive). Works for numbers, text and ISO dates.
- `x LIKE pattern`: `%` = any sequence of 0+ characters, `_` = any single character. In SQLite, LIKE is
  **case-insensitive for ASCII letters** (`'a'` matches `'A'`); in PostgreSQL it is case-sensitive (use `ILIKE`
  there).
- **NULL** and **three-valued logic**: any comparison with NULL (`=`, `<>`, `<`...) gives *unknown*, not true or
  false - and WHERE only keeps rows where the condition is *true*. So `email = NULL` and even `email <> 'x'` skip
  NULL rows. Use `IS NULL` / `IS NOT NULL`.

## Step-by-step examples

**Example 1 - IN** (Shop)

```sql
SELECT first_name, city
FROM customers
WHERE city IN ('London', 'Paris', 'Berlin');
```

**Example 2 - BETWEEN with numbers and dates**

```sql
SELECT name, price
FROM products
WHERE price BETWEEN 20 AND 50;
```

```sql
SELECT id, order_date
FROM orders
WHERE order_date BETWEEN '2025-12-01' AND '2025-12-31';
```

**Example 3 - LIKE patterns**

```sql
SELECT name FROM products WHERE name LIKE 'Wireless%';   -- starts with Wireless
SELECT name FROM products WHERE name LIKE '%Kit%';       -- contains Kit anywhere
SELECT name FROM products WHERE name LIKE '%s';          -- ends with s
SELECT first_name FROM customers WHERE first_name LIKE '_a%';  -- second letter is a
```

**Example 4 - NULL** (School: some students have no email)

```sql
SELECT first_name, last_name
FROM students
WHERE email IS NULL;
```

Now try `WHERE email = NULL` - it returns **no rows**, even though some emails are missing. That is the most
famous SQL trap.

**Example 5 - courses without a teacher yet**

```sql
SELECT title FROM courses WHERE teacher IS NULL;
```

## Common mistakes

- **`= NULL`** instead of `IS NULL` (and `<> NULL` instead of `IS NOT NULL`) - no rows match.
- **Forgetting wildcards**: `name LIKE 'Kit'` only matches exactly "Kit". Use `'%Kit%'` for "contains".
- **Thinking BETWEEN excludes the ends**: `BETWEEN 10 AND 20` includes 10 and 20.
- **Dates with times**: `BETWEEN '2025-12-01' AND '2025-12-31'` misses `'2025-12-31 14:00'` (later than
  `'2025-12-31'` as text). Our datasets store dates without times, so it works here.
- **NOT IN with NULLs**: `x NOT IN (1, NULL)` returns nothing - avoid NULLs in such lists.

## Practical application

Customer searches ("names starting with Sh"), reports for a period (`BETWEEN` two dates), segment filters
(`IN` a list of regions), and data-quality checks ("which customers have no email?" - `IS NULL`) are everyday
tasks. The data-quality project relies heavily on NULL checks.

## Revision notes

- `IN (a, b, c)` - matches any listed value; `NOT IN` - none of them.
- `BETWEEN low AND high` - inclusive range (numbers, text, ISO dates).
- `LIKE`: `%` any characters, `_` one character. Case-insensitive for ASCII in SQLite.
- `NULL` = unknown. Use `IS NULL` / `IS NOT NULL`, never `= NULL`.
- Comparisons with NULL are *unknown*, so WHERE drops those rows.

```exercise
id: in-list
title: Customers in three cities
difficulty: beginner
dataset: shop
instructions: |
  Show `first_name`, `last_name` and `city` of customers living in **Mumbai, Delhi or Bengaluru**, using `IN`.
starter: |
  SELECT first_name, last_name, city
  FROM customers
  WHERE city = 'Mumbai';
hints:
  - "`WHERE city IN ('Mumbai', 'Delhi', 'Bengaluru')`"
solution: |
  SELECT first_name, last_name, city
  FROM customers
  WHERE city IN ('Mumbai', 'Delhi', 'Bengaluru');
explanation: |
  `IN` is a compact way of writing three `=` conditions joined with OR.
check:
  ordered: false
```

```exercise
id: missing-emails
title: Students without an email
difficulty: beginner
dataset: school
instructions: |
  Show the `first_name` and `last_name` of students who have **no email** (the email is NULL).
  The starter uses `= NULL` - run it and notice it returns nothing. Then fix it.
starter: |
  SELECT first_name, last_name
  FROM students
  WHERE email = NULL;
hints:
  - Comparing anything with NULL using `=` is never true.
  - "Use `IS NULL`."
solution: |
  SELECT first_name, last_name
  FROM students
  WHERE email IS NULL;
explanation: |
  NULL means "unknown", so `email = NULL` is unknown for every row and nothing is returned. `IS NULL` is the
  special test for missing values.
check:
  ordered: false
```

```exercise
id: price-range
title: Mid-range products
difficulty: intermediate
dataset: shop
instructions: |
  Show `name` and `price` of products priced **from 15 to 30 (inclusive)** whose name contains the letter
  combination **`er`** anywhere (for example "Charger", "Organiser").
starter: |
  SELECT name, price
  FROM products;
hints:
  - "`price BETWEEN 15 AND 30` includes both ends."
  - "`name LIKE '%er%'` means \"contains er\"."
solution: |
  SELECT name, price
  FROM products
  WHERE price BETWEEN 15 AND 30
    AND name LIKE '%er%';
explanation: |
  BETWEEN gives an inclusive range; `%` on both sides of `er` means any text may come before or after it.
check:
  ordered: false
```

```exercise
id: no-teacher-or-email
title: Data gaps report
difficulty: challenge
dataset: shop
instructions: |
  The marketing team needs customers they **cannot email**: customers whose `email` is NULL, **or** whose
  `segment` is 'Corporate' and who signed up **in 2025** (`signup_date` from '2025-01-01' to '2025-12-31').
  Show `id`, `first_name`, `email`, `segment` and `signup_date`.
starter: |
  SELECT id, first_name, email, segment, signup_date
  FROM customers
  WHERE email = NULL;
hints:
  - "The first part is `email IS NULL`."
  - "The second part needs brackets: `(segment = 'Corporate' AND signup_date BETWEEN '2025-01-01' AND '2025-12-31')`."
solution: |
  SELECT id, first_name, email, segment, signup_date
  FROM customers
  WHERE email IS NULL
     OR (segment = 'Corporate' AND signup_date BETWEEN '2025-01-01' AND '2025-12-31');
explanation: |
  `IS NULL` finds the missing emails. The bracketed AND-group is the second reason to include a customer; OR
  combines the two reasons.
check:
  ordered: false
```

```quiz
- id: q1
  question: Which condition finds rows where `phone` is missing?
  options:
    - phone IS NULL
    - phone = NULL
    - phone = ''
    - phone = 0
  answer: phone IS NULL
  explanation: NULL can only be tested with IS NULL. = NULL is never true.
- id: q2
  question: Does `price BETWEEN 10 AND 20` include a price of exactly 20?
  options:
    - "Yes"
    - "No"
  answer: "Yes"
  explanation: BETWEEN is inclusive at both ends.
- id: q3
  question: Which pattern matches names that **start with** "Sam"?
  options:
    - "'Sam%'"
    - "'%Sam'"
    - "'%Sam%'"
    - "'Sam_'"
  answer: "'Sam%'"
  explanation: "% after Sam allows anything to follow. 'Sam_' would match exactly one more character."
- id: q4
  question: What does `_` mean in a LIKE pattern?
  options:
    - Exactly one character
    - Any number of characters
    - A space
    - Nothing
  answer: Exactly one character
  explanation: "`_` matches one character; `%` matches any number (including zero)."
- id: q5
  question: Which is a shorter way to write `city = 'A' OR city = 'B' OR city = 'C'`?
  type: text
  answer: ["city IN ('A', 'B', 'C')", "city in ('a', 'b', 'c')", "city IN ('A','B','C')"]
  explanation: IN checks membership in a list of values.
- id: q6
  question: Why does `WHERE email <> 'x@y.com'` not return rows where email is NULL?
  options:
    - Comparing NULL with anything gives "unknown", and WHERE keeps only true rows
    - Because NULL equals x@y.com
    - Because <> is not valid SQL
    - It does return them
  answer: Comparing NULL with anything gives "unknown", and WHERE keeps only true rows
  explanation: This is SQL's three-valued logic. Add OR email IS NULL if you want those rows too.
```
