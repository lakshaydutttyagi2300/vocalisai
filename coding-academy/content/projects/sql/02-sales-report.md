---
id: proj-sql-02-sales-report
title: Sales reporting pack
track: sql
order: 2
difficulty: beginner
summary: Build the queries behind a shop's sales report - revenue, orders, best sellers, categories, countries and order statuses - from the Shop database.
dataset: shop
internet: false
skills: [sql-2-1-aggregate-functions, sql-2-2-group-by-having, sql-4-1-inner-join, sql-5-1-case-and-conditional-aggregation, sql-5-2-text-date-number-functions]
stages:
  - name: Beginner
    description: The headline numbers.
    tasks:
      - {id: b1, text: "Total revenue (quantity × unit_price × (1 - discount)) of delivered orders"}
      - {id: b2, text: "Number of orders and average order value"}
      - {id: b3, text: "Top 5 products by units sold, with names"}
  - name: Intermediate
    description: Breakdowns.
    tasks:
      - {id: i1, text: "Revenue by category, with each category's percentage of the total"}
      - {id: i2, text: "Revenue by customer country, highest first"}
      - {id: i3, text: "Order count by status as one row (a pivot), with the cancellation rate in %"}
      - {id: i4, text: "Gross margin per category: revenue minus cost (products.cost × quantity)"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Compare January-June 2025 with January-June 2026 for each category"}
      - {id: e2, text: "Find products whose discounts cost the most revenue"}
      - {id: e3, text: "Save your best queries as VIEWs so the report is one SELECT each"}
---

## Goal

Managers want a sales report. Your job is the SQL behind it. Use **delivered** orders for revenue (cancelled and
returned orders didn't make money), and be explicit about that choice - definitions matter in reporting.

## Definitions

- **Revenue** of an item = `quantity * unit_price * (1 - discount)`.
- **Order value** = sum of its items' revenue.
- **Margin** = revenue - `quantity * products.cost`.

## Hints

- Build a CTE `delivered_items` once (items joined to delivered orders) and reuse it in each query.
- Percent of total: `ROUND(100.0 * x / SUM(x) OVER (), 1)` - an empty `OVER ()` is the whole result.
- Average order value: first total per order (CTE), then `AVG` of those totals.

## Sample solution

```sql
-- 1-2. Headline numbers
WITH delivered_items AS (
    SELECT i.order_id, i.product_id, i.quantity,
           i.quantity * i.unit_price * (1 - i.discount) AS revenue
    FROM order_items AS i
    JOIN orders AS o ON o.id = i.order_id
    WHERE o.status = 'delivered'
),
order_totals AS (
    SELECT order_id, SUM(revenue) AS order_value FROM delivered_items GROUP BY order_id
)
SELECT ROUND(SUM(order_value), 2) AS total_revenue,
       COUNT(*) AS orders,
       ROUND(AVG(order_value), 2) AS avg_order_value
FROM order_totals;
```

```sql
-- 3. Top 5 products by units sold
SELECT p.name, SUM(i.quantity) AS units
FROM order_items AS i
JOIN orders AS o ON o.id = i.order_id
JOIN products AS p ON p.id = i.product_id
WHERE o.status = 'delivered'
GROUP BY p.id, p.name
ORDER BY units DESC, p.name
LIMIT 5;
```

```sql
-- 4. Revenue by category with share of total
SELECT c.name AS category,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS revenue,
       ROUND(100.0 * SUM(i.quantity * i.unit_price * (1 - i.discount))
             / SUM(SUM(i.quantity * i.unit_price * (1 - i.discount))) OVER (), 1) AS pct_of_total
FROM order_items AS i
JOIN orders AS o ON o.id = i.order_id
JOIN products AS p ON p.id = i.product_id
JOIN categories AS c ON c.id = p.category_id
WHERE o.status = 'delivered'
GROUP BY c.name
ORDER BY revenue DESC;
```

```sql
-- 5. Revenue by country
SELECT cu.country,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS revenue
FROM order_items AS i
JOIN orders AS o ON o.id = i.order_id
JOIN customers AS cu ON cu.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY cu.country
ORDER BY revenue DESC;
```

```sql
-- 6. Status pivot and cancellation rate
SELECT COUNT(*) AS orders,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned,
       ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS cancel_rate_pct
FROM orders;
```

```sql
-- 7. Gross margin per category
SELECT c.name AS category,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS revenue,
       ROUND(SUM(i.quantity * p.cost), 2) AS cost,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)) - SUM(i.quantity * p.cost), 2) AS margin
FROM order_items AS i
JOIN orders AS o ON o.id = i.order_id
JOIN products AS p ON p.id = i.product_id
JOIN categories AS c ON c.id = p.category_id
WHERE o.status = 'delivered'
GROUP BY c.name
ORDER BY margin DESC;
```

## Check your work

The category revenues (query 4) must add up to the total revenue (query 1), and so must the country revenues
(query 5). If they don't, a join is losing or duplicating rows.
