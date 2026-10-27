---
id: proj-sql-08-ranking-analytics
title: Rankings and analytics with window functions
track: sql
order: 8
difficulty: challenge
summary: Use window functions on the Shop database for leaderboards, top-N per group, running totals, shares of total, percentiles and period-over-period comparisons.
dataset: shop
internet: false
skills: [sql-6-1-ranking-window-functions, sql-6-2-lag-lead-running-totals, sql-5-4-ctes-and-set-operations, sql-6-3-recursive-ctes-and-decomposition]
stages:
  - name: Beginner
    description: Leaderboards.
    tasks:
      - {id: b1, text: "Rank all products by revenue with RANK and DENSE_RANK side by side"}
      - {id: b2, text: "Top 3 products per category"}
      - {id: b3, text: "Each customer's latest order (ROW_NUMBER by date descending, keep 1)"}
  - name: Intermediate
    description: Analytics.
    tasks:
      - {id: i1, text: "Each category's share of total revenue and the cumulative share (Pareto / 80-20 view)"}
      - {id: i2, text: "Customer spend quartiles with NTILE(4) and the average spend per quartile"}
      - {id: i3, text: "Days between consecutive orders for each customer (LAG), and the average gap per customer"}
      - {id: i4, text: "Product rank in 2025 vs 2026 - which products climbed the most?"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "7-order moving average of order value"}
      - {id: e2, text: "Each month's best-selling product"}
      - {id: e3, text: "Explain in writing when you'd choose ROW_NUMBER, RANK or DENSE_RANK"}
---

## Goal

Window functions turn SQL into an analytics tool. This project collects the patterns analysts use every week.
Build each query step by step with CTEs.

## Hints

- Product revenue CTE first: `product_revenue(product_id, name, category_id, revenue)`.
- Cumulative share: `SUM(revenue) OVER (ORDER BY revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`
  divided by `SUM(revenue) OVER ()`.
- Latest order per customer: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC)`.
- Gaps: `julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date))`.
- Rank change: compute a rank per year in one CTE (`PARTITION BY year`), then join the 2025 rows to the 2026 rows
  on product.

## Sample solution

```sql
-- 1-2. Product leaderboard and top 3 per category
WITH product_revenue AS (
    SELECT p.id AS product_id, p.name, p.category_id,
           SUM(i.quantity * i.unit_price * (1 - i.discount)) AS revenue
    FROM order_items AS i
    JOIN orders AS o ON o.id = i.order_id
    JOIN products AS p ON p.id = i.product_id
    WHERE o.status = 'delivered'
    GROUP BY p.id, p.name, p.category_id
),
ranked AS (
    SELECT *, RANK() OVER (ORDER BY revenue DESC) AS overall_rank,
              DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rank,
              ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC, product_id) AS rank_in_category
    FROM product_revenue
)
SELECT c.name AS category, r.name AS product, ROUND(r.revenue, 2) AS revenue, r.overall_rank, r.rank_in_category
FROM ranked AS r
JOIN categories AS c ON c.id = r.category_id
WHERE r.rank_in_category <= 3
ORDER BY c.name, r.rank_in_category;
```

```sql
-- 3. Each customer's latest order
WITH numbered AS (
    SELECT o.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn
    FROM orders AS o
)
SELECT customer_id, id AS order_id, order_date, status
FROM numbered
WHERE rn = 1
ORDER BY order_date DESC, customer_id;
```

```sql
-- 4. Category share and cumulative share (Pareto)
WITH category_revenue AS (
    SELECT c.name AS category, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS revenue
    FROM order_items AS i
    JOIN orders AS o ON o.id = i.order_id
    JOIN products AS p ON p.id = i.product_id
    JOIN categories AS c ON c.id = p.category_id
    WHERE o.status = 'delivered'
    GROUP BY c.name
)
SELECT category, ROUND(revenue, 2) AS revenue,
       ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS share_pct,
       ROUND(100.0 * SUM(revenue) OVER (ORDER BY revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
             / SUM(revenue) OVER (), 1) AS cumulative_pct
FROM category_revenue
ORDER BY revenue DESC;
```

```sql
-- 5. Customer spend quartiles
WITH spend AS (
    SELECT o.customer_id, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS total
    FROM orders AS o
    JOIN order_items AS i ON i.order_id = o.id
    WHERE o.status = 'delivered'
    GROUP BY o.customer_id
),
quartiles AS (
    SELECT customer_id, total, NTILE(4) OVER (ORDER BY total DESC, customer_id) AS quartile
    FROM spend
)
SELECT quartile, COUNT(*) AS customers, ROUND(AVG(total), 2) AS avg_spend, ROUND(SUM(total), 2) AS total_spend
FROM quartiles
GROUP BY quartile
ORDER BY quartile;
```

```sql
-- 6. Average days between orders per customer
WITH gaps AS (
    SELECT customer_id,
           julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id))
               AS days_since_previous
    FROM orders
)
SELECT customer_id, COUNT(days_since_previous) AS gaps, ROUND(AVG(days_since_previous), 1) AS avg_gap_days
FROM gaps
GROUP BY customer_id
HAVING COUNT(days_since_previous) >= 3
ORDER BY avg_gap_days
LIMIT 10;
```

```sql
-- 7. Rank in 2025 vs 2026
WITH yearly AS (
    SELECT p.name, substr(o.order_date, 1, 4) AS year, SUM(i.quantity * i.unit_price) AS revenue
    FROM order_items AS i
    JOIN orders AS o ON o.id = i.order_id
    JOIN products AS p ON p.id = i.product_id
    WHERE o.status = 'delivered'
    GROUP BY p.name, year
),
ranked AS (
    SELECT name, year, RANK() OVER (PARTITION BY year ORDER BY revenue DESC) AS rnk FROM yearly
)
SELECT a.name, a.rnk AS rank_2025, b.rnk AS rank_2026, a.rnk - b.rnk AS places_climbed
FROM ranked AS a
JOIN ranked AS b ON b.name = a.name AND b.year = '2026'
WHERE a.year = '2025'
ORDER BY places_climbed DESC, a.name
LIMIT 10;
```

## Check your work

In query 4 the last cumulative percentage must be 100.0. In query 5 the four quartiles' customers add up to the
number of customers with delivered orders. Remember 2026 only has six months of data - rankings by revenue
compare a full year with half a year, which is fine for ranks but not for raw totals.
