---
id: sql-cheat-sheet
title: SQL cheat sheet (SQLite)
category: Reference
order: 5
tags: [sql, cheat sheet, syntax, reference, select, join, group by]
---

## The shape of a query

```sql
SELECT   columns / expressions     -- what to show
FROM     table                     -- where from
JOIN     other ON condition        -- combine tables (Level 4)
WHERE    row condition             -- filter rows
GROUP BY columns                   -- one row per group
HAVING   group condition           -- filter groups
ORDER BY columns [DESC]            -- sort
LIMIT    n OFFSET m;               -- cut
```

Processing order: FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.

## Selecting (Level 1)

```sql
SELECT * FROM products;
SELECT name, price * 1.2 AS price_with_tax FROM products;
SELECT DISTINCT country FROM customers;
SELECT first_name || ' ' || last_name AS full_name FROM customers;
```

## Filtering (Level 1)

```sql
WHERE price > 100
WHERE city = 'London' AND segment <> 'Corporate'
WHERE (a OR b) AND c
WHERE country IN ('India', 'UK')
WHERE price BETWEEN 10 AND 20          -- inclusive
WHERE name LIKE 'Py%'                  -- % any text, _ one character
WHERE email IS NULL                    -- never = NULL
```

## Sorting and limiting (Level 1)

```sql
ORDER BY price DESC, name
LIMIT 10 OFFSET 20
```

## Aggregates and groups (Level 2)

```sql
SELECT COUNT(*), COUNT(email), COUNT(DISTINCT city),
       SUM(stock), ROUND(AVG(price), 2), MIN(price), MAX(price)
FROM products;

SELECT category_id, COUNT(*) AS n
FROM products
GROUP BY category_id
HAVING COUNT(*) > 3;
```

## Changing data (Level 3)

```sql
INSERT INTO courses (title, department, credits) VALUES ('Poetry', 'Languages', 2);
UPDATE products SET price = price * 1.1 WHERE category_id = 2;
DELETE FROM orders WHERE status = 'cancelled';
-- Always try the WHERE with a SELECT first!
```

## Tables (Level 3)

```sql
CREATE TABLE pets (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    species TEXT CHECK (species IN ('cat', 'dog')),
    owner_id INTEGER REFERENCES owners (id)
);
ALTER TABLE pets ADD COLUMN born TEXT;
DROP TABLE pets;
```

## Joins (Level 4)

```sql
SELECT o.id, c.first_name
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id;        -- matching rows only

SELECT c.first_name, o.id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;      -- all customers, NULL if no order
```

## Intermediate (Level 5)

```sql
CASE WHEN price > 100 THEN 'high' ELSE 'low' END
UPPER(x)  LOWER(x)  TRIM(x)  LENGTH(x)  SUBSTR(x, 1, 3)  REPLACE(x, 'a', 'b')
date('now')  strftime('%Y-%m', order_date)  julianday(b) - julianday(a)
ROUND(x, 2)  ABS(x)  MAX(a, b)
WHERE price > (SELECT AVG(price) FROM products)       -- subquery
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)
WITH big AS (SELECT ...) SELECT * FROM big;           -- CTE
SELECT ... UNION ALL SELECT ...;
```

## Window functions (Level 6)

```sql
ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC)
RANK() / DENSE_RANK() OVER (ORDER BY total DESC)
LAG(total) OVER (ORDER BY month)
SUM(amount) OVER (ORDER BY tx_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

## Design and performance (Level 7)

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id);
EXPLAIN QUERY PLAN SELECT ...;
BEGIN; ... COMMIT;   -- or ROLLBACK;
```
