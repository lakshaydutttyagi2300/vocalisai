---
id: proj-sql-03-customer-analysis
title: Customer analysis and segmentation
track: sql
order: 3
difficulty: intermediate
summary: Understand the shop's customers - who buys, how often, how recently and how much - and build an RFM-style segmentation and a simple retention view.
dataset: shop
internet: false
skills: [sql-4-2-left-join-and-nulls, sql-5-3-subqueries-and-exists, sql-5-4-ctes-and-set-operations, sql-6-1-ranking-window-functions, sql-5-2-text-date-number-functions]
stages:
  - name: Beginner
    description: Customer basics.
    tasks:
      - {id: b1, text: "Customers per country and per segment"}
      - {id: b2, text: "Customers who never ordered"}
      - {id: b3, text: "Each customer's number of orders, first and last order date"}
  - name: Intermediate
    description: Value and behaviour.
    tasks:
      - {id: i1, text: "Top 10 customers by lifetime spend (delivered orders)"}
      - {id: i2, text: "Recency, frequency and monetary value (RFM) per customer, as of 2026-06-30"}
      - {id: i3, text: "Label customers 'champion', 'loyal', 'at risk' or 'occasional' with CASE rules on RFM"}
      - {id: i4, text: "How many 2025 customers ordered again in 2026 (retention)?"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Score R, F and M from 1-4 with NTILE and combine them"}
      - {id: e2, text: "Average days between a customer's orders (LAG)"}
      - {id: e3, text: "Signup cohorts: customers by signup month and how many of each ordered within 30 days"}
---

## Goal

Marketing wants to know who the best customers are and who is drifting away. **RFM** is a classic method:
**R**ecency (days since last order), **F**requency (number of orders), **M**onetary value (total spend).

## Hints

- "As of" date: use a fixed date (`'2026-06-30'`, the end of the data) instead of `date('now')` so results are
  repeatable.
- Recency: `CAST(julianday('2026-06-30') - julianday(MAX(o.order_date)) AS INTEGER)`.
- Build the RFM table as a CTE, then a second query labels it with CASE.
- Retention: `INTERSECT` of 2025 customers and 2026 customers, or EXISTS.

## Sample solution

```sql
-- 1. Customers per country and segment
SELECT country, segment, COUNT(*) AS customers
FROM customers
GROUP BY country, segment
ORDER BY country, segment;
```

```sql
-- 2. Customers who never ordered
SELECT c.id, c.first_name, c.last_name, c.signup_date
FROM customers AS c
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id);
```

```sql
-- 3. Orders, first and last order per customer
SELECT c.id, c.first_name, c.last_name,
       COUNT(o.id) AS orders, MIN(o.order_date) AS first_order, MAX(o.order_date) AS last_order
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.first_name, c.last_name
ORDER BY orders DESC, c.id;
```

```sql
-- 4-6. RFM with labels
WITH spend AS (
    SELECT o.customer_id, o.id AS order_id, o.order_date,
           SUM(i.quantity * i.unit_price * (1 - i.discount)) AS value
    FROM orders AS o
    JOIN order_items AS i ON i.order_id = o.id
    WHERE o.status = 'delivered'
    GROUP BY o.id
),
rfm AS (
    SELECT customer_id,
           CAST(julianday('2026-06-30') - julianday(MAX(order_date)) AS INTEGER) AS recency_days,
           COUNT(*) AS frequency,
           ROUND(SUM(value), 2) AS monetary
    FROM spend
    GROUP BY customer_id
)
SELECT c.first_name, c.last_name, r.recency_days, r.frequency, r.monetary,
       CASE
           WHEN r.recency_days <= 30 AND r.frequency >= 8 THEN 'champion'
           WHEN r.frequency >= 6 THEN 'loyal'
           WHEN r.recency_days > 90 THEN 'at risk'
           ELSE 'occasional'
       END AS label
FROM rfm AS r
JOIN customers AS c ON c.id = r.customer_id
ORDER BY r.monetary DESC
LIMIT 10;
```

```sql
-- 7. Retention: 2025 customers who ordered again in 2026
WITH y2025 AS (SELECT DISTINCT customer_id FROM orders WHERE order_date < '2026-01-01'),
     y2026 AS (SELECT DISTINCT customer_id FROM orders WHERE order_date >= '2026-01-01')
SELECT (SELECT COUNT(*) FROM y2025) AS customers_2025,
       (SELECT COUNT(*) FROM (SELECT customer_id FROM y2025 INTERSECT SELECT customer_id FROM y2026)) AS came_back,
       ROUND(100.0 * (SELECT COUNT(*) FROM (SELECT customer_id FROM y2025 INTERSECT SELECT customer_id FROM y2026))
             / (SELECT COUNT(*) FROM y2025), 1) AS retention_pct;
```

## Check your work

The number of customers in query 3 should be 60 (every customer, thanks to the LEFT JOIN), and the customers
with 0 orders should match query 2. Try different thresholds in the CASE labels and see how the groups change -
segmentation rules are business decisions, not facts.
