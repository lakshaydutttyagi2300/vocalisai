---
id: sql-3-1-insert-update-delete
title: INSERT, UPDATE and DELETE - safely
track: sql
level: 3
order: 1
minutes: 45
summary: Add new rows, change existing ones and remove rows - and the habits that stop you from accidentally changing or deleting a whole table.
objectives:
  - Add rows with INSERT INTO ... VALUES (one or many rows)
  - Change rows with UPDATE ... SET ... WHERE
  - Remove rows with DELETE FROM ... WHERE
  - Preview the affected rows with SELECT before changing anything
  - Explain why a missing WHERE is dangerous
prerequisites: [sql-1-2-where]
tags: [insert, update, delete, values, set, where, dml, modify, change data, returning, safe]
---

## Simple explanation

So far you have only **read** data. Three statements **change** it:

```sql
-- add a row
INSERT INTO courses (title, department, credits, teacher)
VALUES ('Poetry', 'Languages', 2, 'Mr. Klein');

-- change rows
UPDATE courses
SET credits = 3
WHERE title = 'Poetry';

-- remove rows
DELETE FROM courses
WHERE title = 'Poetry';
```

The **WHERE** clause decides which rows are changed or deleted - exactly like in a SELECT. **Without a WHERE,
every row in the table is changed or deleted.**

> In this app every exercise runs on a fresh copy of the sample database, and the SQL Lab's practice copies can
> be reset at any time - so experiment freely. In real databases, there is no "undo" button.

## Real-world analogy

A table is a **spreadsheet**. INSERT adds a new line at the bottom. UPDATE is "find these lines and change this
cell". DELETE is "find these lines and remove them". Running UPDATE without WHERE is like selecting the
**whole column** and typing over it.

## Technical definition

- `INSERT INTO table (col1, col2, ...) VALUES (v1, v2, ...), (v1, v2, ...);` - always list the columns; columns
  you leave out get their DEFAULT (or NULL). An `INTEGER PRIMARY KEY` column left out gets the next number
  automatically.
- `INSERT INTO table (cols) SELECT ...;` - copy rows from a query.
- `UPDATE table SET col1 = expr, col2 = expr WHERE condition;` - expressions can use the old values
  (`price = price * 1.1`).
- `DELETE FROM table WHERE condition;`
- Constraints still apply: NOT NULL, UNIQUE, CHECK and FOREIGN KEY violations stop the statement with an error
  (e.g. you can't delete a customer who still has orders while foreign keys are enforced).
- `RETURNING` (SQLite 3.35+, PostgreSQL) shows the rows that were changed: `DELETE ... RETURNING *;`
- **Safe habit**: write the `SELECT ... WHERE ...` first, check the rows, then change `SELECT *` to
  `UPDATE ... SET` / `DELETE` keeping the same WHERE. In real systems, wrap changes in a transaction (Level 7)
  and have a backup.
- Other databases: identical syntax for the basics. MySQL and SQL Server also support `UPDATE ... JOIN` styles;
  SQL Server uses `OUTPUT` instead of `RETURNING`.

## Step-by-step examples

**Example 1 - several rows at once** (School)

```sql
INSERT INTO students (first_name, last_name, birth_date, city, email, enrolled_on)
VALUES ('Zara', 'Khan', '2007-03-14', 'Leeds', NULL, '2026-09-01'),
       ('Omar', 'Diaz', '2006-11-02', 'Madrid', 'omar@school.example', '2026-09-01');
```

`id` was left out, so SQLite numbers the new students 25 and 26.

**Example 2 - preview, then update** (Shop)

```sql
-- 1. Preview: which products will change?
SELECT id, name, stock FROM products WHERE stock = 0 AND discontinued = 0;

-- 2. Same WHERE, now the change
UPDATE products
SET stock = 10
WHERE stock = 0 AND discontinued = 0;
```

**Example 3 - updating with a calculation**

```sql
UPDATE products
SET price = ROUND(price * 0.9, 2)       -- 10% off
WHERE category_id = 8;                  -- Stationery
```

**Example 4 - delete with RETURNING**

```sql
DELETE FROM enrollments
WHERE score IS NULL
RETURNING id, student_id, course_id;
```

## Common mistakes

- **Forgetting WHERE** in UPDATE/DELETE - changes every row. Always preview with SELECT first.
- **Not listing the columns** in INSERT (`INSERT INTO t VALUES (...)`) - breaks when the table's columns change
  and is easy to get in the wrong order.
- **Quotes**: text and dates need single quotes (`'Leeds'`); numbers don't. An apostrophe inside text is doubled:
  `'O''Brien'`.
- **`= NULL`** in a WHERE matches nothing - use `IS NULL`.
- **Foreign key errors** when deleting a row that other rows still point to - delete or update the child rows
  first (or design the key with `ON DELETE CASCADE`, Level 3 lesson 3).
- **Expecting an UPDATE with no matching rows to fail** - it succeeds and changes 0 rows. Check the count.

## Practical application

Every app that saves anything uses these statements: signing up inserts a user, editing a profile updates it,
removing an item from a basket deletes a row. Data clean-up jobs use UPDATE to fix spelling or formats. Analysts
mostly read data, but knowing how changes work helps you understand where data comes from - and keeps you safe
when someone gives you write access.

## Revision notes

- `INSERT INTO t (cols) VALUES (...), (...);` - list the columns.
- `UPDATE t SET col = value WHERE ...;`
- `DELETE FROM t WHERE ...;`
- No WHERE = every row. Preview with `SELECT ... WHERE` first.
- Constraints (NOT NULL, UNIQUE, CHECK, FK) still apply and can stop a change.
- `RETURNING` shows changed rows (SQLite/PostgreSQL).

```exercise
id: insert-course
title: Add a new course
difficulty: beginner
dataset: school
instructions: |
  Add a course to the `courses` table: title **Machine Learning**, department **Computing**, **3** credits,
  teacher **Dr. Rao**. Leave out the `id` so SQLite chooses it.

  The check looks at the whole `courses` table after your statement.
starter: |
  -- Look at the table first, then write your INSERT below.
  SELECT * FROM courses;
hints:
  - "Start with `INSERT INTO courses (title, department, credits, teacher)`."
  - "Then `VALUES ('Machine Learning', 'Computing', 3, 'Dr. Rao');` - text in single quotes, the number without."
solution: |
  INSERT INTO courses (title, department, credits, teacher)
  VALUES ('Machine Learning', 'Computing', 3, 'Dr. Rao');
explanation: |
  Listing the columns makes the statement clear and safe. Because `id` is an INTEGER PRIMARY KEY and was left out,
  SQLite gave the new course the next number (9).
check:
  verify: SELECT id, title, department, credits, teacher FROM courses ORDER BY id;
```

```exercise
id: assign-teacher
title: Fill in a missing teacher
difficulty: beginner
dataset: school
instructions: |
  The course **Data Visualisation** has no teacher (NULL). Assign **Ms. Laurent** to it. Only that course may
  change.
starter: |
  -- Preview the row you are going to change:
  SELECT id, title, teacher FROM courses WHERE title = 'Data Visualisation';
hints:
  - "`UPDATE courses SET teacher = ...`"
  - "Keep the same WHERE as the preview: `WHERE title = 'Data Visualisation'`."
solution: |
  UPDATE courses
  SET teacher = 'Ms. Laurent'
  WHERE title = 'Data Visualisation';
explanation: |
  The preview SELECT and the UPDATE share the same WHERE, so you know exactly which row changes. Without the
  WHERE, every course would have been given Ms. Laurent as its teacher.
check:
  verify: SELECT id, title, teacher FROM courses ORDER BY id;
```

```exercise
id: price-rise
title: Raise prices in one category
difficulty: intermediate
dataset: shop
instructions: |
  Electronics (category_id **2**) prices go up by **10%**. Update the `price` of every Electronics product that is
  **not discontinued** (`discontinued = 0`), rounding the new price to 2 decimal places. Other products must not
  change.
starter: |
  SELECT id, name, price, discontinued
  FROM products
  WHERE category_id = 2;
hints:
  - "The new price is `ROUND(price * 1.1, 2)` - an expression using the old price."
  - "Two conditions: `WHERE category_id = 2 AND discontinued = 0`."
solution: |
  UPDATE products
  SET price = ROUND(price * 1.1, 2)
  WHERE category_id = 2 AND discontinued = 0;
explanation: |
  `price * 1.1` is calculated from each row's own old price. The discontinued headphones keep their old price
  because the second condition excludes them.
check:
  verify: SELECT id, price FROM products ORDER BY id;
```

```exercise
id: delete-ungraded
title: Remove ungraded enrolments
difficulty: intermediate
dataset: school
instructions: |
  Delete the enrolments in term **2026-spring** that have **no score yet** (score is NULL). Enrolments in other
  terms, and graded ones, must stay.
starter: |
  SELECT id, student_id, course_id, term, score
  FROM enrollments
  WHERE term = '2026-spring';
hints:
  - "Preview first: add `AND score IS NULL` to the starter's WHERE and run it."
  - "Then `DELETE FROM enrollments WHERE term = '2026-spring' AND score IS NULL;`"
solution: |
  DELETE FROM enrollments
  WHERE term = '2026-spring' AND score IS NULL;
explanation: |
  Eight enrolments match. `score = NULL` would have matched nothing, because NULL is never equal to anything -
  that's why `IS NULL` is needed.
check:
  verify: SELECT term, COUNT(*) AS enrolments, COUNT(score) AS graded FROM enrollments GROUP BY term ORDER BY term;
```

```exercise
id: new-category-products
title: A new category with products
difficulty: challenge
dataset: shop
instructions: |
  Add a category **Music**, then add two products to it in a **single** INSERT:

  | name | price | cost | stock |
  |---|---|---|---|
  | Ukulele | 49.99 | 28.0 | 10 |
  | Guitar Strings | 9.5 | 3.2 | 60 |

  Don't type the new category's id as a number - look it up with a subquery
  `(SELECT id FROM categories WHERE name = 'Music')`. Leave `discontinued` out so it uses its default.
starter: |
  -- 1. INSERT the category
  -- 2. INSERT both products in one statement
hints:
  - "`INSERT INTO categories (name) VALUES ('Music');`"
  - "`INSERT INTO products (name, category_id, price, cost, stock) VALUES (...), (...);` - two rows separated by a comma."
  - "Use the subquery in place of the category id in both rows."
solution: |
  INSERT INTO categories (name) VALUES ('Music');

  INSERT INTO products (name, category_id, price, cost, stock)
  VALUES ('Ukulele', (SELECT id FROM categories WHERE name = 'Music'), 49.99, 28.0, 10),
         ('Guitar Strings', (SELECT id FROM categories WHERE name = 'Music'), 9.5, 3.2, 60);
explanation: |
  Looking the id up by name means your statement still works if the new category gets a different number. Leaving
  out `discontinued` gives both products the default 0 (active).
check:
  verify: |
    SELECT p.name, c.name AS category, p.price, p.cost, p.stock, p.discontinued
    FROM products AS p JOIN categories AS c ON c.id = p.category_id
    WHERE c.name = 'Music'
    ORDER BY p.name;
```

```quiz
- id: q1
  question: What happens when you run `DELETE FROM orders;` with no WHERE?
  options:
    - Every row in orders is deleted
    - Nothing - a WHERE is required
    - Only the first row is deleted
    - The table itself is removed
  answer: Every row in orders is deleted
  explanation: The table still exists, but it is empty. DROP TABLE removes the table itself.
- id: q2
  question: Which statement changes the city of the student with id 7?
  options:
    - UPDATE students SET city = 'Leeds' WHERE id = 7;
    - INSERT INTO students (city) VALUES ('Leeds') WHERE id = 7;
    - CHANGE students city = 'Leeds' WHERE id = 7;
    - UPDATE students WHERE id = 7 SET city = 'Leeds';
  answer: UPDATE students SET city = 'Leeds' WHERE id = 7;
  explanation: UPDATE table SET column = value WHERE condition - in that order.
- id: q3
  question: What is the safest habit before an UPDATE or DELETE?
  options:
    - Run a SELECT with the same WHERE to see which rows will be affected
    - Run it twice to be sure
    - Remove the WHERE to make it simpler
    - Turn off foreign keys
  answer: Run a SELECT with the same WHERE to see which rows will be affected
  explanation: Preview first, then change SELECT * to UPDATE/DELETE keeping the same WHERE.
- id: q4
  question: You INSERT a row and leave out a column that has DEFAULT 0. What value does it get?
  options:
    - '0'
    - NULL
    - An error is raised
    - The value from the previous row
  answer: '0'
  explanation: Columns left out use their DEFAULT; without a default they become NULL (unless NOT NULL forbids it).
- id: q5
  question: How do you write the text O'Brien in SQL?
  options:
    - "'O''Brien'"
    - "'O'Brien'"
    - O'Brien
    - '"O''Brien"'
  answer: "'O''Brien'"
  explanation: Inside single quotes, an apostrophe is written as two single quotes.
- id: q6
  question: An UPDATE's WHERE matches no rows. What happens?
  options:
    - It succeeds and changes 0 rows
    - It raises an error
    - It updates every row instead
    - It inserts a new row
  answer: It succeeds and changes 0 rows
  explanation: Check how many rows changed when it matters.
```
