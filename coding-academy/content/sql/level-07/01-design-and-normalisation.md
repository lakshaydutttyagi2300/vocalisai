---
id: sql-7-1-design-and-normalisation
title: Database design and normalisation
track: sql
level: 7
order: 1
minutes: 50
summary: Design tables from a real-world description - entities, relationships, keys - and use the normal forms (1NF, 2NF, 3NF) to remove duplication and update problems, plus when to denormalise and how views help.
objectives:
  - Identify entities, attributes and relationships (one-to-many, many-to-many) in a description
  - Explain 1NF, 2NF and 3NF in plain language and spot violations
  - Split a messy table into well-structured related tables
  - Know when denormalising (or a view) is the right trade-off
prerequisites: [sql-3-3-constraints-and-keys, sql-4-3-self-joins-and-multiple-joins]
tags: [database design, schema, normalisation, normalization, 1nf, 2nf, 3nf, entity, relationship, one-to-many, many-to-many, junction table, redundancy, anomaly, denormalisation, view, erd]
---

## Simple explanation

**Design** means deciding which tables to create. A good design stores **each fact once**. Look at this single
table:

| order_id | customer | customer_email | product | price | qty |
|---|---|---|---|---|---|
| 1 | Asha | asha@x.example | Kettle | 25.00 | 1 |
| 1 | Asha | asha@x.example | Mug | 4.50 | 2 |
| 2 | Asha | asha@y.example | Mug | 4.50 | 1 |

Problems: Asha's email is repeated (and already inconsistent!), the price of a mug is stored many times, and you
can't add a new product until someone orders it. **Normalisation** fixes this by splitting the table:
`customers`, `products`, `orders`, `order_items` - linked by keys. The Shop sample database is designed exactly
like that.

## Real-world analogy

A badly designed table is a **notebook where you rewrite your friend's address every time you mention them**.
When they move, you must find and fix every page - and you'll miss some. A normalised design is an **address
book**: the address is written once, and everything else just says "see Asha".

## Technical definition

- **Entity** = a thing you store (customer, product, order) → a table. **Attribute** = a property → a column.
  **Relationship**: one-to-many (a customer has many orders → foreign key on the "many" side), many-to-many
  (orders contain many products, products appear in many orders → **junction table** `order_items`), one-to-one
  (rare; often just extra columns).
- **Anomalies** in unnormalised data: *update* (change in one place, forget another), *insert* (can't store a
  product without an order), *delete* (deleting the last order loses the product's price).
- **1NF**: each cell holds **one value** (no lists like `"red, blue"`, no repeating columns `phone1, phone2,
  phone3`) and rows are identifiable by a key.
- **2NF**: (for composite keys) every non-key column depends on the **whole** key. In `order_items(order_id,
  product_id, qty, product_name)`, `product_name` depends only on `product_id` → move it to `products`.
- **3NF**: no non-key column depends on **another non-key column**. In `customers(id, city, country)`, if
  country is determined by city, store cities in their own table. (In practice, judgement applies.)
  Memory aid: every column depends on "the key, the whole key, and nothing but the key".
- **Denormalisation**: deliberately repeating data for speed or simplicity (reporting tables, caches,
  `unit_price` copied into order_items to record the price *at the time of the order*). Do it knowingly.
- **Views**: `CREATE VIEW name AS SELECT ...` - a saved query that behaves like a read-only table; gives users a
  simple "flat" picture without storing duplicates.
- **ERD** (entity relationship diagram): boxes for tables, lines for relationships (crow's feet mark "many").

## Step-by-step examples

**Example 1 - fixing a 1NF violation** (Blank database)

```sql
-- Bad: several values in one cell
CREATE TABLE students_bad (id INTEGER PRIMARY KEY, name TEXT, courses TEXT);   -- 'Maths, Art'

-- Good: one row per student-course pair
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE courses  (id INTEGER PRIMARY KEY, title TEXT NOT NULL UNIQUE);
CREATE TABLE enrolments (
    student_id INTEGER NOT NULL REFERENCES students (id),
    course_id  INTEGER NOT NULL REFERENCES courses (id),
    PRIMARY KEY (student_id, course_id)
);
```

**Example 2 - extracting a lookup table from existing data** (Shop)

```sql
CREATE TABLE countries (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO countries (name) SELECT DISTINCT country FROM customers ORDER BY country;
SELECT * FROM countries;
```

**Example 3 - a view for a flat report**

```sql
CREATE VIEW order_lines AS
SELECT o.id AS order_id, o.order_date, c.first_name, p.name AS product, i.quantity, i.unit_price
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items i ON i.order_id = o.id
JOIN products p ON p.id = i.product_id;

SELECT * FROM order_lines WHERE order_date >= '2026-06-01';
```

## Common mistakes

- **Lists in a column** (`tags = 'sql,python'`) - impossible to query reliably. Use a junction table.
- **Repeating columns** (`item1, item2, item3`) - what about the fourth? Use rows.
- **Storing derived values** (an `age` column, an order `total`) that can drift out of date - calculate them,
  or keep them updated deliberately.
- **Over-normalising** small, stable lookups into dozens of tables - aim for clarity.
- **No foreign keys** - relationships exist only in your head, and bad links creep in.
- **Using names as keys** - names change and repeat; use ids.

## Practical application

When you start your own project database (expense tracker, inventory, a club's membership list), sketch the
entities and relationships first, then create tables with keys and constraints. Most real-world data you receive
(spreadsheets, CSV exports) is not normalised; knowing the normal forms tells you how to split it when you import
it.

## Revision notes

- Entities → tables, attributes → columns, relationships → foreign keys / junction tables.
- 1NF: one value per cell, no repeating columns. 2NF: depend on the whole key. 3NF: nothing but the key.
- Normalise to avoid update/insert/delete anomalies; denormalise deliberately for reporting.
- Views give flat, read-only pictures without duplicating data.

```exercise
id: one-value-per-cell
title: Fix a list stored in one column
difficulty: beginner
dataset: blank
instructions: |
  A recipe app stored tags as text like `'vegan,quick'`. Design it properly instead:

  - **recipes** (`id` INTEGER PRIMARY KEY, `title` TEXT NOT NULL)
  - **tags** (`id` INTEGER PRIMARY KEY, `name` TEXT NOT NULL UNIQUE)
  - **recipe_tags** (`recipe_id` and `tag_id`, both required and referencing their tables, with the pair as the
    primary key)

  Then add recipe **Lentil soup** (id 1) with tags **vegan** (id 1) and **quick** (id 2).
starter: |
  CREATE TABLE recipes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, tags TEXT);
  INSERT INTO recipes (id, title, tags) VALUES (1, 'Lentil soup', 'vegan,quick');
hints:
  - "Remove the tags column from recipes; create `tags` and the junction table `recipe_tags`."
  - "`recipe_id INTEGER NOT NULL REFERENCES recipes (id)`, `tag_id INTEGER NOT NULL REFERENCES tags (id)`, `PRIMARY KEY (recipe_id, tag_id)`."
  - "Insert the recipe, the two tags, then two rows into recipe_tags: (1, 1) and (1, 2)."
solution: |
  CREATE TABLE recipes (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
  CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
  CREATE TABLE recipe_tags (
      recipe_id INTEGER NOT NULL REFERENCES recipes (id),
      tag_id    INTEGER NOT NULL REFERENCES tags (id),
      PRIMARY KEY (recipe_id, tag_id)
  );
  INSERT INTO recipes (id, title) VALUES (1, 'Lentil soup');
  INSERT INTO tags (id, name) VALUES (1, 'vegan'), (2, 'quick');
  INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (1, 1), (1, 2);
explanation: |
  Now "all quick recipes" is a simple join instead of a fragile text search, a tag is spelled the same way
  everywhere, and the composite key stops the same tag being attached twice.
check:
  verify: |
    SELECT r.title, t.name AS tag,
           (SELECT COUNT(*) FROM pragma_table_info('recipes')) AS recipe_columns,
           (SELECT COUNT(*) FROM pragma_foreign_key_list('recipe_tags')) AS foreign_keys,
           (SELECT GROUP_CONCAT(name) FROM pragma_table_info('recipe_tags') WHERE pk > 0) AS key_columns
    FROM recipe_tags AS rt
    JOIN recipes AS r ON r.id = rt.recipe_id
    JOIN tags AS t ON t.id = rt.tag_id
    ORDER BY t.name;
```

```exercise
id: extract-lookup
title: Extract a lookup table from existing data
difficulty: intermediate
dataset: shop
instructions: |
  Customer countries are stored as repeated text. Normalise them:

  1. Create **countries** (`id` INTEGER PRIMARY KEY, `name` TEXT NOT NULL UNIQUE).
  2. Fill it with the distinct countries from `customers`, in alphabetical order (so Australia gets id 1).
  3. Add a column **country_id** (INTEGER, referencing countries(id)) to `customers`.
  4. Set every customer's `country_id` to the matching country's id.
starter: |
  -- 1. CREATE TABLE countries ...
  -- 2. INSERT INTO countries (name) SELECT ...
  -- 3. ALTER TABLE customers ADD COLUMN ...
  -- 4. UPDATE customers SET country_id = (...)
hints:
  - "`INSERT INTO countries (name) SELECT DISTINCT country FROM customers ORDER BY country;`"
  - "`ALTER TABLE customers ADD COLUMN country_id INTEGER REFERENCES countries (id);`"
  - "A correlated subquery fills it: `UPDATE customers SET country_id = (SELECT id FROM countries WHERE countries.name = customers.country);`"
solution: |
  CREATE TABLE countries (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
  INSERT INTO countries (name) SELECT DISTINCT country FROM customers ORDER BY country;
  ALTER TABLE customers ADD COLUMN country_id INTEGER REFERENCES countries (id);
  UPDATE customers
  SET country_id = (SELECT id FROM countries WHERE countries.name = customers.country);
explanation: |
  This is the standard way to normalise existing data: create the lookup table from the distinct values, add the
  foreign key column, fill it with a correlated subquery. A final step (not required here) would be to drop the old
  text column once everything uses `country_id`.
check:
  verify: |
    SELECT co.id, co.name, COUNT(cu.id) AS customers
    FROM countries AS co
    LEFT JOIN customers AS cu ON cu.country_id = co.id
    GROUP BY co.id, co.name
    ORDER BY co.id;
```

```exercise
id: reporting-view
title: A view for a flat report
difficulty: challenge
dataset: school
instructions: |
  Create a view called **report_card** that shows one row per enrolment with: `term`, the student's
  **student** name (first and last name with a space), the course **title**, `score` and `grade`. Then the check
  queries the view.
starter: |
  -- CREATE VIEW report_card AS
  -- SELECT ...
hints:
  - "`CREATE VIEW report_card AS SELECT e.term, s.first_name || ' ' || s.last_name AS student, c.title, e.score, e.grade FROM ...`"
  - "Join enrollments → students and enrollments → courses."
solution: |
  CREATE VIEW report_card AS
  SELECT e.term,
         s.first_name || ' ' || s.last_name AS student,
         c.title,
         e.score,
         e.grade
  FROM enrollments AS e
  JOIN students AS s ON s.id = e.student_id
  JOIN courses AS c ON c.id = e.course_id;
explanation: |
  The view stores the query, not the data: it always shows current values, and users who just want a flat report
  can treat it like a table - while the underlying tables stay normalised.
check:
  verify: |
    SELECT term, COUNT(*) AS enrolments, COUNT(DISTINCT student) AS students, ROUND(AVG(score), 2) AS avg_score,
           (SELECT type FROM sqlite_master WHERE name = 'report_card') AS object_type
    FROM report_card
    GROUP BY term
    ORDER BY term;
```

```quiz
- id: q1
  question: A column stores 'red, green, blue'. Which rule does this break?
  options:
    - 1NF - one value per cell
    - 2NF
    - 3NF
    - No rule
  answer: 1NF - one value per cell
  explanation: Store one colour per row, usually in a separate table.
- id: q2
  question: How is a many-to-many relationship stored?
  options:
    - With a junction table holding pairs of foreign keys
    - With a list in a text column
    - With a foreign key on both tables pointing at each other
    - It can't be stored in SQL
  answer: With a junction table holding pairs of foreign keys
  explanation: e.g. order_items between orders and products.
- id: q3
  question: Repeating a customer's email on every order row can cause which problem?
  options:
    - An update anomaly - changing it in one row but not others
    - Faster updates
    - A syntax error
    - Foreign keys stop working
  answer: An update anomaly - changing it in one row but not others
  explanation: Store the email once, in customers.
- id: q4
  question: What does 3NF add to 2NF?
  options:
    - No non-key column may depend on another non-key column
    - Every table needs three columns
    - Every key must be composite
    - No NULLs are allowed
  answer: No non-key column may depend on another non-key column
  explanation: '"The key, the whole key, and nothing but the key."'
- id: q5
  question: Why does order_items store unit_price even though products has a price?
  options:
    - To record the price at the time of the order - a deliberate denormalisation
    - It's a mistake
    - SQLite requires it
    - To make the table bigger
  answer: To record the price at the time of the order - a deliberate denormalisation
  explanation: The product's current price can change later; the order's price must not.
- id: q6
  question: What is a view?
  options:
    - A saved query that can be used like a read-only table
    - A copy of a table's data
    - An index
    - A backup
  answer: A saved query that can be used like a read-only table
  explanation: It always reflects the current data in its tables.
```
