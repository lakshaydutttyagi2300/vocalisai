---
id: sql-4-1-inner-join
title: INNER JOIN - combining tables
track: sql
level: 4
order: 1
minutes: 45
summary: Combine rows from related tables with JOIN ... ON, use table aliases, join three or more tables, and summarise joined data.
objectives:
  - Explain why data is split across tables and linked by keys
  - Join two tables with INNER JOIN ... ON
  - Use table aliases and qualify column names
  - Join three or more tables in one query
  - Combine joins with WHERE, GROUP BY and ORDER BY
prerequisites: [sql-2-2-group-by-having]
tags: [join, inner join, on, alias, foreign key, relationship, combine tables, multiple joins, qualified column]
---

## Simple explanation

Good databases store each fact **once**. An order doesn't repeat the customer's name and city - it stores the
customer's **id**, and the name lives in the `customers` table. To see both together, you **join** the tables:

```sql
SELECT orders.id, orders.order_date, customers.first_name, customers.last_name
FROM orders
JOIN customers ON customers.id = orders.customer_id;
```

For each order, SQL finds the customer row whose `id` equals the order's `customer_id` and puts them side by
side. `JOIN` on its own means **INNER JOIN**: rows without a match on the other side are left out.

## Real-world analogy

Think of two lists: a **class register** (student number, name) and a **marks sheet** (student number, mark).
To write report cards you match each mark to the name with the same student number. That matching is a join;
the student number is the **key** you match on.

## Technical definition

- `FROM a JOIN b ON <condition>` - the condition (usually `b.key = a.foreign_key`) decides which rows pair up.
  INNER JOIN returns only pairs where the condition is true.
- **Aliases** shorten names: `FROM orders AS o JOIN customers AS c ON c.id = o.customer_id` (the `AS` is
  optional). Once a table has an alias, use the alias.
- **Qualify** columns that exist in both tables (`o.id`, `c.id`) - otherwise "ambiguous column name".
- **Several joins**: `FROM order_items i JOIN products p ON p.id = i.product_id JOIN categories c ON c.id =
  p.category_id` - each JOIN adds one table.
- Logical order: FROM + JOINs build a combined row set → WHERE filters → GROUP BY → HAVING → SELECT → ORDER BY.
- One-to-many: joining one customer to their many orders repeats the customer's columns on every order row.
- Older style `FROM a, b WHERE a.id = b.a_id` does the same as an inner join; the `JOIN ... ON` style is clearer.
- Same syntax in PostgreSQL, MySQL and SQL Server.

## Step-by-step examples

**Example 1 - products with their category names** (Shop)

```sql
SELECT p.name AS product, c.name AS category, p.price
FROM products AS p
JOIN categories AS c ON c.id = p.category_id
ORDER BY category, product;
```

Both tables have a `name` column, so the aliases `p.name` and `c.name` say which one you mean.

**Example 2 - filter on a joined column**

```sql
SELECT o.id, o.order_date, c.first_name, c.country
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE c.country = 'India' AND o.status = 'delivered';
```

**Example 3 - three tables and a summary**

```sql
SELECT c.name AS category, SUM(i.quantity) AS units_sold
FROM order_items AS i
JOIN products   AS p ON p.id = i.product_id
JOIN categories AS c ON c.id = p.category_id
GROUP BY c.name
ORDER BY units_sold DESC;
```

**Example 4 - school: who got which score in which course**

```sql
SELECT s.first_name, s.last_name, co.title, e.score
FROM enrollments AS e
JOIN students AS s  ON s.id = e.student_id
JOIN courses  AS co ON co.id = e.course_id
WHERE e.term = '2025-autumn'
ORDER BY e.score DESC;
```

## Common mistakes

- **Forgetting the ON condition** (or writing a wrong one) - every row pairs with every other row: a huge,
  meaningless result (a "Cartesian product").
- **Joining on the wrong columns** - `c.id = o.id` compares a customer id with an order id. Always match the
  foreign key to the key it references.
- **Ambiguous column name** - qualify columns that exist in several tables.
- **Using the full table name after giving an alias** - once aliased, use the alias.
- **Expecting INNER JOIN to keep unmatched rows** - customers with no orders disappear. Use LEFT JOIN (next
  lesson).

## Practical application

Almost every real question needs a join: "sales by category", "orders by country", "which students failed which
course", "hours per project per department". Knowing the keys that connect tables (look at the table structures
in the SQL Lab - foreign keys are listed) is the first step of every analysis.

## Revision notes

- `FROM a JOIN b ON b.key = a.foreign_key` - INNER JOIN keeps matching pairs only.
- Aliases (`orders AS o`) and qualified names (`o.id`).
- Chain joins for more tables; then WHERE / GROUP BY / ORDER BY as usual.
- Missing or wrong ON → wrong or exploding results.

```exercise
id: product-categories
title: Products with category names
difficulty: beginner
dataset: shop
instructions: |
  Show every product's name (column **product**) with its category's name (column **category**). Use aliases
  for both tables.
starter: |
  SELECT name, category_id
  FROM products;
hints:
  - "`FROM products AS p JOIN categories AS c ON c.id = p.category_id`"
  - "Select `p.name AS product, c.name AS category`."
solution: |
  SELECT p.name AS product, c.name AS category
  FROM products AS p
  JOIN categories AS c ON c.id = p.category_id;
explanation: |
  Each product's `category_id` matches exactly one category `id`, so every product appears once with its category
  name. The aliases make it clear which `name` column is which.
check:
  ordered: false
  columns: true
```

```exercise
id: june-orders
title: Orders with customer names
difficulty: beginner
dataset: shop
instructions: |
  List the orders placed in **June 2026** (`order_date` from `'2026-06-01'` to `'2026-06-30'`) with the order
  `id`, `order_date` and the customer's `first_name` and `last_name`, oldest order first (ties by order id).
starter: |
  SELECT id, order_date, customer_id
  FROM orders
  WHERE order_date BETWEEN '2026-06-01' AND '2026-06-30';
hints:
  - "Join customers: `JOIN customers AS c ON c.id = o.customer_id` (give orders the alias `o`)."
  - "Qualify the order's id as `o.id` - customers also has an id column."
  - "`ORDER BY o.order_date, o.id`"
solution: |
  SELECT o.id, o.order_date, c.first_name, c.last_name
  FROM orders AS o
  JOIN customers AS c ON c.id = o.customer_id
  WHERE o.order_date BETWEEN '2026-06-01' AND '2026-06-30'
  ORDER BY o.order_date, o.id;
explanation: |
  The join adds the customer's name to each order; the WHERE then keeps only June's orders. Without `o.` in front
  of `id`, SQLite wouldn't know whether you meant the order id or the customer id.
check:
  ordered: true
```

```exercise
id: units-by-category
title: Units sold per category
difficulty: intermediate
dataset: shop
instructions: |
  For each category, show its name (column **category**) and the total `quantity` sold across all order items
  (column **units_sold**), largest first. You need three tables: `order_items` → `products` → `categories`.
starter: |
  SELECT product_id, SUM(quantity) AS units_sold
  FROM order_items
  GROUP BY product_id;
hints:
  - "Start `FROM order_items AS i JOIN products AS p ON p.id = i.product_id`."
  - "Add `JOIN categories AS c ON c.id = p.category_id`."
  - "`GROUP BY c.name` and `ORDER BY units_sold DESC`."
solution: |
  SELECT c.name AS category, SUM(i.quantity) AS units_sold
  FROM order_items AS i
  JOIN products AS p ON p.id = i.product_id
  JOIN categories AS c ON c.id = p.category_id
  GROUP BY c.name
  ORDER BY units_sold DESC;
explanation: |
  The first join finds each item's product, the second the product's category; then the rows are grouped by
  category name and the quantities added up.
check:
  ordered: true
  columns: true
```

```exercise
id: revenue-by-country
title: Revenue by country
difficulty: challenge
dataset: shop
instructions: |
  For **delivered** orders only, show each customer `country` and its revenue (column **revenue**), where an
  item's revenue is `quantity * unit_price * (1 - discount)`. Round the total to 2 decimals and sort by revenue,
  highest first.
starter: |
  SELECT country
  FROM customers;
hints:
  - "You need `order_items`, `orders` (for the status and customer) and `customers` (for the country)."
  - "`FROM order_items AS i JOIN orders AS o ON o.id = i.order_id JOIN customers AS c ON c.id = o.customer_id`"
  - "`WHERE o.status = 'delivered'`, `GROUP BY c.country`, and `ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS revenue`."
solution: |
  SELECT c.country,
         ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS revenue
  FROM order_items AS i
  JOIN orders AS o ON o.id = i.order_id
  JOIN customers AS c ON c.id = o.customer_id
  WHERE o.status = 'delivered'
  GROUP BY c.country
  ORDER BY revenue DESC;
explanation: |
  The query walks the chain item → order → customer. The status filter is applied before grouping, so cancelled
  and returned orders don't count. Rounding the final SUM (not each item) avoids rounding errors adding up.
check:
  ordered: true
  columns: true
```

```quiz
- id: q1
  question: What does an INNER JOIN return?
  options:
    - Only rows that have a match in both tables
    - All rows from both tables
    - All rows from the first table, matched or not
    - Only rows with no match
  answer: Only rows that have a match in both tables
  explanation: Unmatched rows are dropped. LEFT JOIN keeps unmatched rows from the left table.
- id: q2
  question: Which ON condition correctly joins orders to customers?
  options:
    - ON customers.id = orders.customer_id
    - ON customers.id = orders.id
    - ON customers.customer_id = orders.customer_id
    - ON orders.order_date = customers.signup_date
  answer: ON customers.id = orders.customer_id
  explanation: Match the foreign key (orders.customer_id) to the key it references (customers.id).
- id: q3
  question: 'You get "ambiguous column name: id". What is the fix?'
  options:
    - Qualify the column with its table or alias, e.g. o.id
    - Remove the JOIN
    - Rename the table
    - Add DISTINCT
  answer: Qualify the column with its table or alias, e.g. o.id
  explanation: Both tables have an id column, so SQL needs to know which one you mean.
- id: q4
  question: What usually happens if you forget the ON condition entirely (e.g. with CROSS JOIN or a comma join)?
  options:
    - Every row of one table is paired with every row of the other
    - The query returns no rows
    - SQL guesses the right columns
    - Only the first rows are joined
  answer: Every row of one table is paired with every row of the other
  explanation: 60 customers × 420 orders = 25,200 meaningless rows.
- id: q5
  question: After `FROM products AS p`, how should you refer to the product's price?
  options:
    - p.price
    - products.p.price
    - price.p
    - AS.price
  answer: p.price
  explanation: Once a table has an alias, use the alias.
- id: q6
  question: Why is data split into several tables instead of one big table?
  options:
    - So each fact is stored once and stays consistent
    - Because tables can only have 5 columns
    - To make queries impossible
    - It isn't - one table is always better
  answer: So each fact is stored once and stays consistent
  explanation: A customer's name lives in one place; orders point to it with a key.
```
