---
id: sql-1-2-where
title: Filtering rows with WHERE, AND, OR and NOT
track: sql
level: 1
order: 2
minutes: 35
summary: Keep only the rows you want - comparison operators, text and number conditions, and combining conditions with AND, OR, NOT and brackets.
objectives:
  - Filter rows with WHERE and the comparison operators = <> != < > <= >=
  - Compare numbers, text and dates correctly
  - Combine conditions with AND, OR and NOT
  - Use brackets to control how AND and OR combine
prerequisites: [sql-1-1-select-aliases-distinct]
tags: [where, filter, comparison, and, or, not, condition, brackets]
---

## Simple explanation

`WHERE` keeps only the rows that match a **condition**:

```sql
SELECT first_name, city
FROM students
WHERE city = 'London';
```

Only students whose city is exactly `London` appear. Comparison operators:

| Operator | Meaning |
|---|---|
| `=` | equal (one `=` in SQL, unlike Python's `==`) |
| `<>` or `!=` | not equal |
| `<` `>` `<=` `>=` | less / greater (or equal) |

Combine conditions:

- `AND` - both must be true: `city = 'London' AND credits >= 3`
- `OR` - at least one: `city = 'London' OR city = 'Mumbai'`
- `NOT` - reverses: `NOT city = 'London'`

## Real-world analogy

`WHERE` is like the **filter buttons on a shopping website**: "show only shoes, size 8, under 50". Each filter
removes the items that do not match; the products themselves are not changed.

## Technical definition

- Clause order: `SELECT ... FROM ... WHERE condition`. The database evaluates `WHERE` **for each row** of the
  `FROM` table and keeps rows where the condition is **true**.
- **Text** literals use single quotes. Comparisons are **case-sensitive** in SQLite for `=` (`'london'` does
  not match `'London'`). (MySQL is usually case-insensitive; PostgreSQL is case-sensitive.)
- **Dates** in SQLite are stored as text like `'2025-11-30'`. Because this format runs from biggest unit to
  smallest, text comparison works: `order_date >= '2026-01-01'`.
- **Precedence**: `NOT` before `AND` before `OR`. `a OR b AND c` means `a OR (b AND c)`. Use **brackets** to make
  your intention explicit.
- `WHERE` cannot use column aliases defined in the same SELECT (in most databases), because WHERE is evaluated
  before SELECT. (SQLite is lenient, but do not rely on it.)

## Step-by-step examples

**Example 1 - numbers** (Shop)

```sql
SELECT name, price
FROM products
WHERE price > 100;
```

**Example 2 - text** (Shop)

```sql
SELECT first_name, last_name, country
FROM customers
WHERE country = 'India';
```

**Example 3 - not equal**

```sql
SELECT id, order_date, status
FROM orders
WHERE status <> 'delivered';
```

**Example 4 - AND**: products that are cheap **and** in stock

```sql
SELECT name, price, stock
FROM products
WHERE price < 20 AND stock > 0;
```

**Example 5 - OR with brackets**: customers from India or the UK who are corporate

```sql
SELECT first_name, country, segment
FROM customers
WHERE (country = 'India' OR country = 'UK')
  AND segment = 'Corporate';
```

Without the brackets, SQL would read it as `country = 'India' OR (country = 'UK' AND segment = 'Corporate')` -
which includes *all* Indian customers, corporate or not.

**Example 6 - dates**: orders in 2026

```sql
SELECT id, order_date
FROM orders
WHERE order_date >= '2026-01-01';
```

## Common mistakes

- **Double `==`**: SQL uses a single `=` for comparison.
- **Missing quotes around text**: `WHERE city = London` → *no such column: London*.
- **Case mismatch**: `'india'` does not equal `'India'` in SQLite.
- **Forgetting brackets** when mixing AND and OR.
- **Repeating the column wrongly**: `WHERE city = 'London' OR 'Mumbai'` is wrong - write
  `city = 'London' OR city = 'Mumbai'` (or use `IN`, next lesson).
- **Quoting numbers**: `WHERE price > '100'` compares differently in some databases - leave numbers unquoted.

## Practical application

Almost every real query filters: *this month's orders, active customers, products low in stock, failed
payments*. Combining conditions precisely - with brackets - is what makes a report correct rather than almost
correct.

## Revision notes

- `WHERE condition` keeps matching rows; it goes after FROM.
- `=` equal (single!), `<>`/`!=` not equal, `< > <= >=`.
- Text and dates in single quotes; ISO dates (`'2026-01-31'`) compare correctly as text.
- `AND` both, `OR` either, `NOT` reverses. Precedence NOT → AND → OR - use brackets.
- `=` on text is case-sensitive in SQLite.

```exercise
id: london-students
title: Students in London
difficulty: beginner
dataset: school
instructions: |
  Show the `first_name` and `last_name` of students whose `city` is **London**.
starter: |
  SELECT first_name, last_name
  FROM students;
hints:
  - Add a WHERE clause after FROM.
  - "Text needs single quotes: `WHERE city = 'London'`."
solution: |
  SELECT first_name, last_name
  FROM students
  WHERE city = 'London';
explanation: |
  WHERE keeps only the rows where the condition is true. Text values go in single quotes.
check:
  ordered: false
```

```exercise
id: expensive-products
title: Expensive products
difficulty: beginner
dataset: shop
instructions: |
  Show the `name` and `price` of products that cost **more than 100**.
starter: |
  SELECT name, price
  FROM products;
hints:
  - "`WHERE price > 100`"
  - Numbers do not need quotes.
solution: |
  SELECT name, price
  FROM products
  WHERE price > 100;
explanation: |
  The `>` comparison keeps only products whose price is greater than 100 (exactly 100 would be excluded).
check:
  ordered: false
```

```exercise
id: cheap-in-stock
title: Cheap and available
difficulty: intermediate
dataset: shop
instructions: |
  Show `name`, `price` and `stock` of products that cost **less than 30**, have **stock greater than 0**, and are
  **not discontinued** (`discontinued = 0`).
starter: |
  SELECT name, price, stock
  FROM products
  WHERE price < 30;
hints:
  - Combine three conditions with AND.
  - "`WHERE price < 30 AND stock > 0 AND discontinued = 0`"
solution: |
  SELECT name, price, stock
  FROM products
  WHERE price < 30
    AND stock > 0
    AND discontinued = 0;
explanation: |
  With AND, every condition must be true for a row to be kept. Putting each condition on its own line makes the
  query easy to read.
check:
  ordered: false
```

```exercise
id: brackets-matter
title: Brackets matter
difficulty: challenge
dataset: shop
instructions: |
  Find **orders placed in 2026** whose status is **'cancelled' or 'returned'**. Show `id`, `order_date` and
  `status`.

  The starter query has a precedence bug: it returns *every* returned order, even from 2025. Fix it.
starter: |
  SELECT id, order_date, status
  FROM orders
  WHERE status = 'cancelled' OR status = 'returned' AND order_date >= '2026-01-01';
hints:
  - AND is evaluated before OR. Which conditions should be grouped together?
  - "Put brackets around the two status conditions: `(status = 'cancelled' OR status = 'returned') AND ...`"
solution: |
  SELECT id, order_date, status
  FROM orders
  WHERE (status = 'cancelled' OR status = 'returned')
    AND order_date >= '2026-01-01';
explanation: |
  Without brackets the query meant `cancelled (any date) OR (returned AND 2026)`. Brackets make the date
  condition apply to both statuses.
check:
  ordered: false
```

```quiz
- id: q1
  question: Which clause filters rows?
  options:
    - WHERE
    - SELECT
    - FROM
    - DISTINCT
  answer: WHERE
  explanation: WHERE keeps only rows that satisfy its condition.
- id: q2
  question: Which is the correct way to compare text in SQL?
  options:
    - "WHERE city = 'Paris'"
    - "WHERE city == 'Paris'"
    - "WHERE city = Paris"
    - "WHERE city IS Paris"
  answer: "WHERE city = 'Paris'"
  explanation: One equals sign, and text in single quotes.
- id: q3
  question: How is `a OR b AND c` evaluated?
  options:
    - a OR (b AND c)
    - (a OR b) AND c
    - Left to right
    - It is an error
  answer: a OR (b AND c)
  explanation: AND has higher precedence than OR. Use brackets when you mean something else.
- id: q4
  question: Which operator means "not equal" in standard SQL?
  type: text
  answer: ["<>", "!="]
  explanation: "`<>` is the standard; `!=` also works in SQLite and most databases."
- id: q5
  question: Why does `WHERE order_date >= '2026-01-01'` work on text dates?
  options:
    - Because YYYY-MM-DD text sorts in the same order as the dates
    - Because SQLite converts all text to numbers
    - It does not work
    - Because of the quotes
  answer: Because YYYY-MM-DD text sorts in the same order as the dates
  explanation: Year, then month, then day - so alphabetical order equals date order.
- id: q6
  question: 'In SQLite, does `WHERE country = ''india''` match the value India?'
  options:
    - No - = is case-sensitive for text in SQLite
    - Yes - SQL ignores case
    - Only if the table is small
    - Only with DISTINCT
  answer: No - = is case-sensitive for text in SQLite
  explanation: Use the exact spelling, or compare with LOWER(country) = 'india' (Level 5).
```
