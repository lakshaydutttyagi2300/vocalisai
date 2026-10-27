---
id: sql-3-2-create-alter-drop
title: Creating, changing and removing tables
track: sql
level: 3
order: 2
minutes: 40
summary: Design your own tables with CREATE TABLE, choose data types and defaults, change tables later with ALTER TABLE, copy query results into new tables, and remove tables with DROP.
objectives:
  - Create a table with suitable column types, a primary key and defaults
  - Add, rename and remove columns with ALTER TABLE
  - Create a table from a query with CREATE TABLE ... AS SELECT
  - Remove tables safely with DROP TABLE IF EXISTS
  - Explain how SQLite's flexible types differ from other databases
prerequisites: [sql-3-1-insert-update-delete]
tags: [create table, alter table, drop table, add column, rename, data types, integer, text, real, default, ddl, schema, create table as, if not exists]
---

## Simple explanation

`CREATE TABLE` builds a new, empty table. You give each column a **name** and a **type**:

```sql
CREATE TABLE books (
    id     INTEGER PRIMARY KEY,     -- unique number for each book
    title  TEXT NOT NULL,           -- must be filled in
    author TEXT NOT NULL,
    year   INTEGER,
    price  REAL DEFAULT 0           -- 0 when not given
);
```

Tables can be changed later with `ALTER TABLE` (for example to add a column) and removed completely with
`DROP TABLE`.

These "structure" statements are called **DDL** (Data Definition Language); INSERT/UPDATE/DELETE are **DML**
(Data Manipulation Language).

## Real-world analogy

Creating a table is like **designing a paper form** before anyone fills it in: you decide the boxes (columns),
what goes in each (type), which are mandatory (NOT NULL) and what's pre-printed (DEFAULT). ALTER TABLE is
reprinting the form with an extra box. DROP TABLE is shredding the form **and every copy that was filled in**.

## Technical definition

- **SQLite types** (storage classes): `INTEGER`, `REAL` (decimal numbers), `TEXT`, `BLOB` (binary), and NULL.
  Dates are usually stored as `TEXT` in `'YYYY-MM-DD'` format. SQLite is **flexible**: a column's type is a
  preference ("affinity"), and it will store a text value in an INTEGER column. `CREATE TABLE ... STRICT`
  (SQLite 3.37+) enforces types.
- **Other databases** are strict and have more types: `VARCHAR(100)`, `DECIMAL(10,2)` for money, `DATE`,
  `TIMESTAMP`, `BOOLEAN`; PostgreSQL uses `SERIAL`/`GENERATED ... AS IDENTITY` for auto-numbers, MySQL
  `AUTO_INCREMENT`, SQL Server `IDENTITY(1,1)`.
- `INTEGER PRIMARY KEY` in SQLite auto-numbers new rows.
- `CREATE TABLE IF NOT EXISTS ...` / `DROP TABLE IF EXISTS ...` avoid errors when the table does/doesn't exist.
- `CREATE TABLE new_table AS SELECT ...;` copies a query's result into a new table (without keys/constraints).
- `ALTER TABLE t ADD COLUMN c TYPE [NOT NULL DEFAULT x];` (NOT NULL needs a default when the table has rows),
  `ALTER TABLE t RENAME TO new_name;`, `ALTER TABLE t RENAME COLUMN a TO b;`, `ALTER TABLE t DROP COLUMN c;`
  (SQLite 3.35+). Other changes (e.g. changing a column's type) in SQLite need "create new table, copy data,
  drop old, rename".
- Look at a table's structure: `PRAGMA table_info(books);` or `SELECT * FROM pragma_table_info('books');`
  (the SQL Lab also shows structures). Other databases: `information_schema.columns`.

## Step-by-step examples

**Example 1 - create, fill, look** (Blank database)

```sql
CREATE TABLE habits (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    minutes INTEGER DEFAULT 10
);
INSERT INTO habits (name, minutes) VALUES ('Reading', 20);
INSERT INTO habits (name) VALUES ('Stretching');       -- minutes becomes 10
SELECT * FROM habits;
```

**Example 2 - add a column to an existing table** (Shop)

```sql
ALTER TABLE customers ADD COLUMN newsletter INTEGER NOT NULL DEFAULT 0;
SELECT first_name, newsletter FROM customers LIMIT 3;
```

Every existing customer gets the default 0.

**Example 3 - a table from a query**

```sql
CREATE TABLE big_orders AS
SELECT order_id, SUM(quantity * unit_price) AS value
FROM order_items
GROUP BY order_id
HAVING value > 500;
```

**Example 4 - rename and drop**

```sql
ALTER TABLE big_orders RENAME TO large_orders;
DROP TABLE IF EXISTS large_orders;
```

## Common mistakes

- **Missing commas** between column definitions, or a **trailing comma** after the last one - syntax error.
- **Storing dates in random formats** (`'3/4/26'`) - use `'YYYY-MM-DD'` so sorting and date functions work.
- **Money as REAL** in serious systems - rounding errors; other databases use DECIMAL, or store whole pennies as
  INTEGER.
- **DROP TABLE on the wrong table** - there is no undo. Back up first; in this app you can reset practice
  databases.
- **Adding a NOT NULL column without a DEFAULT** to a table that already has rows - error.
- **Expecting CREATE TABLE AS to copy keys and constraints** - it copies only column names and data.

## Practical application

You create tables whenever you start a new project (a habit tracker, an expense log, a project's database), and
you alter them as requirements grow ("we now need a phone number"). Analysts use `CREATE TABLE ... AS SELECT`
to save intermediate results, and temporary tables to break big problems into steps. In teams, structure
changes are written as **migration** scripts so every copy of the database changes the same way.

## Revision notes

- `CREATE TABLE t (col TYPE constraints, ...);` - INTEGER, REAL, TEXT, BLOB.
- `INTEGER PRIMARY KEY` auto-numbers; `DEFAULT` fills missing values.
- `ALTER TABLE ... ADD COLUMN / RENAME TO / RENAME COLUMN / DROP COLUMN`.
- `CREATE TABLE new AS SELECT ...` copies data but not constraints.
- `DROP TABLE IF EXISTS t;` - permanent.
- SQLite types are flexible (use STRICT to enforce); other databases are strict and richer.

```exercise
id: create-books
title: Create a books table
difficulty: beginner
dataset: blank
instructions: |
  Create a table named **books** with these columns, in this order:

  | column | type | rule |
  |---|---|---|
  | id | INTEGER | PRIMARY KEY |
  | title | TEXT | NOT NULL |
  | author | TEXT | NOT NULL |
  | year | INTEGER | |
  | price | REAL | |

  The check compares the table's structure.
starter: |
  CREATE TABLE books (
      -- your columns here
  );
hints:
  - "Each column is `name TYPE rules`, separated by commas: `id INTEGER PRIMARY KEY,`"
  - "No comma after the last column (`price REAL`)."
solution: |
  CREATE TABLE books (
      id     INTEGER PRIMARY KEY,
      title  TEXT NOT NULL,
      author TEXT NOT NULL,
      year   INTEGER,
      price  REAL
  );
explanation: |
  The primary key gives each book a unique, automatic number, and NOT NULL makes title and author mandatory.
  `year` and `price` may be left empty (NULL).
check:
  verify: SELECT name, UPPER(type) AS type, "notnull" AS not_null, pk FROM pragma_table_info('books') ORDER BY cid;
```

```exercise
id: create-and-fill
title: Create a table with a default and fill it
difficulty: beginner
dataset: blank
instructions: |
  1. Create a table **habits** with columns `id` (INTEGER PRIMARY KEY), `name` (TEXT NOT NULL) and `minutes`
     (INTEGER with **DEFAULT 10**).
  2. Insert three habits: **Reading** for 20 minutes, **Stretching** (don't give minutes - use the default) and
     **Journaling** for 5 minutes, in that order.
starter: |
  -- 1. CREATE TABLE habits ...

  -- 2. INSERT the three habits
hints:
  - "`minutes INTEGER DEFAULT 10` sets the default."
  - "For Stretching, list only the name: `INSERT INTO habits (name) VALUES ('Stretching');`"
  - "You can insert all three in one statement only if every row lists the same columns - so use separate INSERTs here."
solution: |
  CREATE TABLE habits (
      id      INTEGER PRIMARY KEY,
      name    TEXT NOT NULL,
      minutes INTEGER DEFAULT 10
  );
  INSERT INTO habits (name, minutes) VALUES ('Reading', 20);
  INSERT INTO habits (name) VALUES ('Stretching');
  INSERT INTO habits (name, minutes) VALUES ('Journaling', 5);
explanation: |
  Stretching got 10 minutes from the DEFAULT because its INSERT didn't mention `minutes`. Writing `NULL`
  explicitly would have stored NULL instead - a default is only used when the column is left out.
check:
  verify: SELECT id, name, minutes FROM habits ORDER BY id;
```

```exercise
id: add-loyalty-column
title: Add a column to an existing table
difficulty: intermediate
dataset: shop
instructions: |
  The shop is starting a loyalty scheme.

  1. Add a column **loyalty_points** to `customers`: INTEGER, NOT NULL, DEFAULT 0.
  2. Give every **Corporate** customer (segment = 'Corporate') **100** points.
starter: |
  -- 1. ALTER TABLE ...

  -- 2. UPDATE ...
hints:
  - "`ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0;`"
  - "Then `UPDATE customers SET loyalty_points = 100 WHERE segment = 'Corporate';`"
solution: |
  ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0;
  UPDATE customers SET loyalty_points = 100 WHERE segment = 'Corporate';
explanation: |
  The DEFAULT fills the new column for all 60 existing customers - which is also why NOT NULL is allowed here.
  The UPDATE then changes only the Corporate ones.
check:
  verify: |
    SELECT segment, COUNT(*) AS customers, SUM(loyalty_points) AS points,
           (SELECT "notnull" || '/' || dflt_value FROM pragma_table_info('customers')
            WHERE name = 'loyalty_points') AS rule
    FROM customers
    GROUP BY segment
    ORDER BY segment;
```

```exercise
id: summary-table
title: Save a query as a table, then rename it
difficulty: challenge
dataset: shop
instructions: |
  1. Create a table **category_stock** from a query: for **active** products (`discontinued = 0`), one row per
     `category_id` with the number of products (column **products**) and total `stock` (column **units**).
  2. Rename the table to **stock_summary**.
starter: |
  -- 1. CREATE TABLE category_stock AS SELECT ...

  -- 2. ALTER TABLE ... RENAME TO ...
hints:
  - "The query: `SELECT category_id, COUNT(*) AS products, SUM(stock) AS units FROM products WHERE discontinued = 0 GROUP BY category_id`."
  - "Put `CREATE TABLE category_stock AS` in front of it."
  - "`ALTER TABLE category_stock RENAME TO stock_summary;`"
solution: |
  CREATE TABLE category_stock AS
  SELECT category_id, COUNT(*) AS products, SUM(stock) AS units
  FROM products
  WHERE discontinued = 0
  GROUP BY category_id;

  ALTER TABLE category_stock RENAME TO stock_summary;
explanation: |
  The new table holds a snapshot of the numbers at the moment it was created - it will not update when products
  change (a VIEW would). After the rename, the old name no longer exists.
check:
  verify: |
    SELECT category_id, products, units,
           (SELECT COUNT(*) FROM sqlite_master WHERE name = 'category_stock') AS old_name_left
    FROM stock_summary
    ORDER BY category_id;
```

```quiz
- id: q1
  question: Which statement removes a table and all its rows permanently?
  options:
    - DROP TABLE t;
    - DELETE FROM t;
    - ALTER TABLE t REMOVE;
    - TRUNCATE COLUMN t;
  answer: DROP TABLE t;
  explanation: DELETE FROM t empties the table but keeps it; DROP TABLE removes it entirely.
- id: q2
  question: What happens with `INTEGER PRIMARY KEY` when you insert a row without an id in SQLite?
  options:
    - SQLite gives the row the next number automatically
    - The insert fails
    - The id is NULL
    - The id is always 0
  answer: SQLite gives the row the next number automatically
  explanation: Other databases use AUTO_INCREMENT, SERIAL or IDENTITY for the same idea.
- id: q3
  question: In which format should dates be stored as text so they sort correctly?
  options:
    - "'YYYY-MM-DD', e.g. '2026-03-04'"
    - "'DD/MM/YY', e.g. '04/03/26'"
    - "'Month D, YYYY'"
    - Any format works the same
  answer: "'YYYY-MM-DD', e.g. '2026-03-04'"
  explanation: Year-month-day text sorts in date order and works with SQLite's date functions.
- id: q4
  question: What does `CREATE TABLE copy AS SELECT * FROM products;` NOT copy?
  options:
    - Primary keys and other constraints
    - The rows
    - The column names
    - The values
  answer: Primary keys and other constraints
  explanation: Only names and data are copied.
- id: q5
  question: Why can't you add `phone TEXT NOT NULL` (with no default) to a table that already has rows?
  options:
    - The existing rows would have NULL in a column that forbids NULL
    - Tables can't have more than one TEXT column
    - ALTER TABLE can't add columns
    - Phone numbers must be INTEGER
  answer: The existing rows would have NULL in a column that forbids NULL
  explanation: Give a DEFAULT, or allow NULL.
- id: q6
  question: How are SQLite's column types different from PostgreSQL's?
  options:
    - SQLite treats types as preferences unless the table is STRICT; PostgreSQL enforces them
    - SQLite has no types at all
    - PostgreSQL only has TEXT
    - They are identical
  answer: SQLite treats types as preferences unless the table is STRICT; PostgreSQL enforces them
  explanation: SQLite will store '12abc' in an INTEGER column; PostgreSQL would reject it.
```
