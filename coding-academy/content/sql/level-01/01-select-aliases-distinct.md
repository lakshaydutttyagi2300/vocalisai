---
id: sql-1-1-select-aliases-distinct
title: SELECT in depth - calculated columns, aliases and DISTINCT
track: sql
level: 1
order: 1
minutes: 35
summary: Shape your results - calculate new columns, give columns friendly names with AS, and remove duplicate rows with DISTINCT.
objectives:
  - Select specific columns in a chosen order
  - Create calculated columns with arithmetic
  - Rename columns with aliases (AS)
  - Remove duplicate rows with DISTINCT
prerequisites: [sql-0-2-what-is-sql]
tags: [select, alias, as, distinct, calculated column, expression, concatenation]
---

## Simple explanation

`SELECT` does more than pick columns. You can:

1. **Calculate** new values: `price * 2`, `price - cost`.
2. **Rename** any column in the result with `AS`: `price - cost AS profit`.
3. **Remove duplicates** with `DISTINCT`: `SELECT DISTINCT city FROM customers` lists each city once.

```sql
SELECT name, price, price - cost AS profit
FROM products;
```

This shows each product's name, price, and a new column called `profit`. The table itself is not changed - the
calculation exists only in the result.

## Real-world analogy

Imagine asking an assistant to prepare a summary from a big filing cabinet: *"For each product, write the name,
the price and the profit (price minus cost), and label that column 'profit'."* The cabinet stays the same; you
just get a neat new sheet. `DISTINCT` is like asking *"Which cities do our customers come from? List each city
once, please."*

## Technical definition

- The **SELECT list** is a comma-separated list of **expressions**: column names, literals, arithmetic
  (`+ - * /`), function calls, and more.
- **Column alias**: `expression AS alias_name` names a result column. `AS` is optional (`price * 2 doubled`),
  but writing it is clearer. Use an alias without spaces, or put it in double quotes (`AS "unit price"`).
- **String concatenation** in SQLite (and standard SQL) uses `||`: `first_name || ' ' || last_name`. (MySQL uses
  `CONCAT(...)`; SQL Server uses `+` or `CONCAT`.)
- **`DISTINCT`** removes duplicate **rows** from the result. With several columns, a row is a duplicate only if
  *all* its selected values match another row.
- Integer arithmetic: in SQLite, `7 / 2` is `3` (both integers). Use `7.0 / 2` or `CAST(... AS REAL)` for `3.5`.

## Step-by-step examples

Using the **Shop** database (`products`: id, name, category_id, price, cost, stock, discontinued).

**Example 1 - calculated column with an alias**

```sql
SELECT name, price, cost, price - cost AS profit
FROM products;
```

Each row now has a `profit` column. Without `AS profit`, the column would be called `price - cost` - correct
but ugly.

**Example 2 - full names by joining text**

```sql
SELECT first_name || ' ' || last_name AS full_name, city
FROM customers;
```

`||` glues text together; `' '` adds a space between first and last names.

**Example 3 - DISTINCT values**

```sql
SELECT DISTINCT country
FROM customers;
```

Every country appears once, even though many customers share a country.

**Example 4 - DISTINCT on two columns**

```sql
SELECT DISTINCT city, country
FROM customers;
```

Each *combination* of city and country appears once.

**Example 5 - stock value per product**

```sql
SELECT name, stock, price, stock * price AS stock_value
FROM products;
```

## Common mistakes

- **Expecting the table to change**: calculated columns and aliases exist only in the result.
- **Spaces in aliases without quotes**: `AS stock value` fails; use `stock_value` or `"stock value"`.
- **`DISTINCT` in the wrong place**: it goes right after `SELECT` and applies to the whole row, not one column:
  `SELECT city, DISTINCT country` is an error.
- **Using `+` to join text** in SQLite: `'a' + 'b'` gives `0`! Use `||`.
- **Integer division surprises**: `SELECT 5 / 2` gives `2` in SQLite.

## Practical application

Reports rarely show raw columns: they show *profit*, *full name*, *total value*, *price with tax*. Aliases make
results readable for other people (and for spreadsheets you export to). `DISTINCT` answers "which different
values exist?" - which countries we sell to, which statuses orders can have.

## Revision notes

- SELECT list = expressions: columns, calculations, functions.
- `expression AS name` renames a result column (alias).
- `||` joins text in SQLite: `first_name || ' ' || last_name`.
- `SELECT DISTINCT ...` removes duplicate rows (all selected columns must match).
- Results are temporary - the table does not change.
- `5 / 2` → `2` in SQLite (integer division); `5.0 / 2` → `2.5`.

```exercise
id: profit-column
title: Profit per product
difficulty: beginner
dataset: shop
instructions: |
  For every product, show `name`, `price` and a calculated column named **`profit`** (price minus cost).
starter: |
  SELECT name, price
  FROM products;
hints:
  - Add a third expression to the SELECT list.
  - "`price - cost AS profit`"
solution: |
  SELECT name, price, price - cost AS profit
  FROM products;
explanation: |
  The expression `price - cost` is calculated for each row; `AS profit` names the new column.
check:
  ordered: false
  columns: true
```

```exercise
id: distinct-countries
title: Which countries?
difficulty: beginner
dataset: shop
instructions: |
  List each **country** that customers come from, with no duplicates (one column called `country`).
starter: |
  SELECT country
  FROM customers;
hints:
  - The starter repeats countries. Which keyword removes duplicates?
solution: |
  SELECT DISTINCT country
  FROM customers;
explanation: |
  `DISTINCT` keeps one copy of each different value.
check:
  ordered: false
```

```exercise
id: full-names
title: Full names
difficulty: intermediate
dataset: school
instructions: |
  Show one column called **`full_name`** containing each student's first name, a space, and last name
  (e.g. `Priya Sharma`), followed by their `city`.
starter: |
  SELECT first_name, last_name, city
  FROM students;
hints:
  - "Join text in SQLite with `||`."
  - "`first_name || ' ' || last_name AS full_name`"
solution: |
  SELECT first_name || ' ' || last_name AS full_name, city
  FROM students;
explanation: |
  `||` concatenates text. The `' '` in the middle is a string containing one space, so the names do not run
  together.
check:
  ordered: false
  columns: true
```

```exercise
id: stock-value
title: Stock value report
difficulty: challenge
dataset: shop
instructions: |
  Produce a report with these columns, in this order and with these exact names:

  - `product` - the product name
  - `units` - the stock
  - `value` - stock multiplied by price
  - `value_at_cost` - stock multiplied by cost
starter: |
  SELECT name, stock
  FROM products;
hints:
  - Use `AS` four times so every column has the requested name.
  - "`stock * price AS value`"
solution: |
  SELECT name AS product,
         stock AS units,
         stock * price AS value,
         stock * cost AS value_at_cost
  FROM products;
explanation: |
  Aliases can rename plain columns too (`name AS product`). Laying out one expression per line keeps long SELECT
  lists readable.
check:
  ordered: false
  columns: true
```

```quiz
- id: q1
  question: What does `AS` do in `SELECT price * 2 AS double_price FROM products`?
  options:
    - Gives the calculated column the name double_price in the result
    - Changes the price column in the table
    - Creates a new table
    - Sorts the result
  answer: Gives the calculated column the name double_price in the result
  explanation: AS creates an alias - a name for a result column. The table is unchanged.
- id: q2
  question: Which keyword removes duplicate rows from a result?
  type: text
  answer: ["DISTINCT"]
  explanation: SELECT DISTINCT keeps one copy of each different row.
- id: q3
  question: In SQLite, which operator joins two pieces of text?
  options:
    - "||"
    - "+"
    - "&"
    - "."
  answer: "||"
  explanation: "`'a' || 'b'` gives 'ab'. MySQL uses CONCAT(); SQL Server uses + or CONCAT()."
- id: q4
  question: What does `SELECT 9 / 2;` return in SQLite?
  type: text
  answer: ["4"]
  explanation: Both numbers are integers, so SQLite performs integer division. Use 9.0 / 2 for 4.5.
- id: q5
  question: '`SELECT DISTINCT city, country FROM customers` returns ...'
  options:
    - each different combination of city and country once
    - each city once, ignoring country
    - only the first customer
    - an error - DISTINCT works with one column only
  answer: each different combination of city and country once
  explanation: DISTINCT applies to the whole selected row.
- id: q6
  question: Does `SELECT name, price - cost AS profit FROM products` add a profit column to the products table?
  options:
    - No, the profit column only exists in the result
    - Yes, permanently
    - Yes, until the app restarts
    - Only if the table is empty
  answer: No, the profit column only exists in the result
  explanation: SELECT never changes stored data.
```
