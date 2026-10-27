---
id: sql-7-2-indexes-and-query-plans
title: Indexes, query plans and performance
track: sql
level: 7
order: 2
minutes: 45
summary: Understand how indexes speed up searches, create single-column, composite, unique and partial indexes, read query plans with EXPLAIN QUERY PLAN, and know when an index does not help.
objectives:
  - Explain what an index is and why it speeds up lookups
  - Create single-column, composite, unique and partial indexes
  - Read EXPLAIN QUERY PLAN output (SCAN vs SEARCH)
  - Choose column order in composite indexes
  - Name the costs of indexes and common performance habits
prerequisites: [sql-7-1-design-and-normalisation]
tags: [index, create index, drop index, composite index, unique index, partial index, covering index, explain, explain query plan, scan, search, performance, optimisation, sargable]
---

## Simple explanation

Without help, to find the orders of customer 42 the database **reads every row** of `orders` - a **full table
scan**. An **index** is a sorted list of a column's values with pointers to the rows, so the database can
**jump** to the right place:

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id);
```

You can ask SQLite how it plans to run a query:

```sql
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;
-- before the index:  SCAN orders
-- after the index:   SEARCH orders USING INDEX idx_orders_customer (customer_id=?)
```

`SCAN` = read everything; `SEARCH ... USING INDEX` = jump straight to matching rows.

> The sample databases are small, so you won't *feel* the speed difference here - with millions of rows, the
> difference is seconds versus milliseconds. The query plan shows the difference even on small tables.

## Real-world analogy

An index is the **index at the back of a book**: to find "recursion", you look it up alphabetically and jump to
page 214 instead of reading the whole book. Like a book index, it takes space and must be updated whenever the
content changes.

## Technical definition

- `CREATE [UNIQUE] INDEX name ON table (col1 [, col2 ...]) [WHERE condition];` and `DROP INDEX name;`
- Primary keys and UNIQUE constraints create indexes automatically.
- **Composite index** `(a, b)`: helps queries filtering on `a`, or on `a` and `b` - like a phone book sorted by
  surname then first name. It does **not** help a filter on `b` alone. Put the column tested with `=` first,
  then the range/sort column.
- **Partial index** (`WHERE status = 'pending'`) indexes only some rows - small and fast for a common filter.
- **Covering index**: contains every column a query needs, so the table itself isn't read (`USING COVERING
  INDEX`).
- Indexes help `WHERE`, `JOIN ... ON`, `ORDER BY` and `GROUP BY` on the indexed columns. They're usually
  **not** used when the column is wrapped in a function (`WHERE UPPER(email) = ...`), for `LIKE '%text'`, or
  when most rows match anyway.
- **Costs**: disk space, slower INSERT/UPDATE/DELETE (every index must be updated). Index columns that are
  searched often and are selective (many different values).
- `EXPLAIN QUERY PLAN` (SQLite); PostgreSQL `EXPLAIN ANALYZE`; MySQL `EXPLAIN`; SQL Server "execution plan".
  `ANALYZE` collects statistics that help the planner choose.
- General habits: select only needed columns, filter early, avoid functions on indexed columns in WHERE, check
  plans for SCANs on big tables, measure before and after.

## Step-by-step examples

**Example 1 - seeing the plan change** (Shop)

```sql
EXPLAIN QUERY PLAN SELECT id, order_date FROM orders WHERE customer_id = 42;
CREATE INDEX idx_orders_customer ON orders (customer_id);
EXPLAIN QUERY PLAN SELECT id, order_date FROM orders WHERE customer_id = 42;
```

Run the three statements together in the SQL Lab: the first plan says `SCAN`, the last says `SEARCH`.

**Example 2 - a composite index for a common filter**

```sql
CREATE INDEX idx_orders_status_date ON orders (status, order_date);
EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE status = 'pending' AND order_date >= '2026-01-01';
```

**Example 3 - a function hides the index**

```sql
CREATE INDEX idx_customers_city ON customers (city);
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE city = 'Paris';          -- SEARCH
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE UPPER(city) = 'PARIS';   -- SCAN
```

**Example 4 - a partial index**

```sql
CREATE INDEX idx_pending_orders ON orders (order_date) WHERE status = 'pending';
```

## Common mistakes

- **Indexing everything** - every insert/update pays for every index. Index what queries actually filter on.
- **Wrong column order** in composite indexes - `(order_date, status)` is weaker for `status = ... AND
  order_date >= ...` than `(status, order_date)`.
- **Functions on indexed columns** in WHERE - write `city = 'Paris'` (and store data consistently) rather than
  `UPPER(city) = 'PARIS'`.
- **Expecting an index to fix a bad query** - fetching 1 million rows is slow with or without an index.
- **Guessing** - look at the plan and measure.

## Practical application

When a report or app page gets slow, the usual first step is: find the slow query, run EXPLAIN, look for SCANs on
big tables in WHERE or JOIN conditions, add a suitable index, and check the plan again. Foreign key columns
(`orders.customer_id`, `order_items.order_id`) are classic candidates because they're used in every join.

## Revision notes

- Index = sorted lookup structure; SCAN (read all) vs SEARCH (jump).
- `CREATE INDEX name ON t (cols)`; UNIQUE, composite, partial (`WHERE ...`) variants; `DROP INDEX`.
- Composite: equality column first, then range/sort column; leftmost columns must be used.
- Functions on the column, leading `%` wildcards and low selectivity defeat indexes.
- Indexes cost space and write speed - add them for real query needs; check with EXPLAIN QUERY PLAN.

```exercise
id: index-foreign-key
title: Index a foreign key column
difficulty: beginner
dataset: shop
instructions: |
  Queries often look up the items of an order (`WHERE order_id = ...`). Create an index on
  `order_items (order_id)`. Any index name is fine - the check looks at which column is indexed.
starter: |
  EXPLAIN QUERY PLAN
  SELECT * FROM order_items WHERE order_id = 100;
hints:
  - "`CREATE INDEX idx_order_items_order ON order_items (order_id);`"
  - "Run the EXPLAIN again after creating the index: SCAN becomes SEARCH."
solution: |
  CREATE INDEX idx_order_items_order ON order_items (order_id);
explanation: |
  Foreign key columns are used in nearly every join, so they're the most common columns to index. SQLite doesn't
  create these automatically (primary keys and UNIQUE columns get indexes; foreign keys don't).
check:
  verify: |
    SELECT ii.seqno, ii.name AS indexed_column, il."unique", il.partial
    FROM pragma_index_list('order_items') AS il, pragma_index_info(il.name) AS ii
    WHERE il.origin = 'c'
    ORDER BY ii.seqno;
```

```exercise
id: composite-index
title: A composite index in the right order
difficulty: intermediate
dataset: shop
instructions: |
  The order dashboard runs this query constantly:

  ```sql
  SELECT id, order_date FROM orders
  WHERE status = 'pending' AND order_date >= '2026-01-01';
  ```

  Create an index named **idx_orders_status_date** on `orders` with the column tested by `=` first and the range
  column second. The check runs `EXPLAIN QUERY PLAN` on the query above.
starter: |
  CREATE INDEX idx_orders_status_date ON orders (order_date);
hints:
  - "Two columns in the index: `(status, order_date)`."
  - "Equality (`status = ...`) first, range (`order_date >= ...`) second."
solution: |
  CREATE INDEX idx_orders_status_date ON orders (status, order_date);
explanation: |
  With `(status, order_date)` SQLite jumps to the 'pending' part of the index and then reads only the dates from
  2026 onwards - both conditions use the index. With only `order_date`, it can use the date range, then must check
  every 2026 order's status.
check:
  verify: |
    EXPLAIN QUERY PLAN
    SELECT id, order_date FROM orders
    WHERE status = 'pending' AND order_date >= '2026-01-01';
```

```exercise
id: partial-unique-index
title: Partial and unique indexes
difficulty: challenge
dataset: shop
instructions: |
  1. Create a **partial index** named **idx_pending_orders** on `orders (order_date)` that only includes rows
     with `status = 'pending'`.
  2. Create a **unique index** named **idx_products_name** on `products (name)` so two products can never have
     the same name.
starter: |
  -- 1. CREATE INDEX ... WHERE ...
  -- 2. CREATE UNIQUE INDEX ...
hints:
  - "`CREATE INDEX idx_pending_orders ON orders (order_date) WHERE status = 'pending';`"
  - "`CREATE UNIQUE INDEX idx_products_name ON products (name);`"
solution: |
  CREATE INDEX idx_pending_orders ON orders (order_date) WHERE status = 'pending';
  CREATE UNIQUE INDEX idx_products_name ON products (name);
explanation: |
  The partial index only holds the 13 pending orders, so it's tiny but perfect for "pending orders by date". The
  unique index works like a UNIQUE constraint added after the table was created - it would fail if duplicate names
  already existed.
check:
  verify: |
    SELECT il.name AS index_name, il."unique", il.partial, ii.name AS indexed_column
    FROM sqlite_master AS m, pragma_index_list(m.name) AS il, pragma_index_info(il.name) AS ii
    WHERE m.type = 'table' AND il.origin = 'c'
    ORDER BY il.name;
```

```quiz
- id: q1
  question: In a query plan, what does SCAN orders mean?
  options:
    - The whole orders table is read row by row
    - An index is used to jump to the rows
    - The table is being backed up
    - The query has an error
  answer: The whole orders table is read row by row
  explanation: SEARCH ... USING INDEX means the database jumps to matching rows.
- id: q2
  question: An index on (status, order_date) helps which filter most?
  options:
    - WHERE status = 'pending' AND order_date >= '2026-01-01'
    - WHERE order_date >= '2026-01-01' only
    - WHERE customer_id = 5
    - WHERE UPPER(status) = 'PENDING'
  answer: WHERE status = 'pending' AND order_date >= '2026-01-01'
  explanation: The leftmost column (status) must be used for the index to help.
- id: q3
  question: What is a cost of adding many indexes?
  options:
    - INSERT, UPDATE and DELETE get slower and the database gets bigger
    - SELECT queries always get slower
    - Data can be lost
    - Foreign keys stop working
  answer: INSERT, UPDATE and DELETE get slower and the database gets bigger
  explanation: Every change must also update every index.
- id: q4
  question: Why may `WHERE UPPER(email) = 'A@B.COM'` not use an index on email?
  options:
    - The index stores email values, not UPPER(email) values
    - UPPER is not allowed in WHERE
    - Indexes only work on numbers
    - Emails can't be indexed
  answer: The index stores email values, not UPPER(email) values
  explanation: Store data consistently and compare the column directly (or create an index on the expression).
- id: q5
  question: Which columns are good index candidates?
  options:
    - Columns often used in WHERE and JOIN conditions with many different values
    - Every column in every table
    - Columns that are never queried
    - Columns with only two possible values used in every row
  answer: Columns often used in WHERE and JOIN conditions with many different values
  explanation: Foreign keys and frequently searched identifiers are classic examples.
- id: q6
  question: Which SQLite statement shows how a query will be executed?
  options:
    - EXPLAIN QUERY PLAN
    - SHOW PLAN
    - DESCRIBE QUERY
    - ANALYZE TABLE
  answer: EXPLAIN QUERY PLAN
  explanation: PostgreSQL uses EXPLAIN / EXPLAIN ANALYZE.
```
