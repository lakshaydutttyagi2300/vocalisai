---
id: proj-sql-07-monthly-kpis
title: Monthly KPI report
track: sql
order: 7
difficulty: intermediate
summary: Build a month-by-month KPI table for the shop - orders, revenue, customers, new customers, average order value and month-over-month growth - in one well-structured query.
dataset: shop
internet: false
skills: [sql-5-4-ctes-and-set-operations, sql-6-2-lag-lead-running-totals, sql-6-3-recursive-ctes-and-decomposition, sql-5-2-text-date-number-functions]
stages:
  - name: Beginner
    description: The basic monthly numbers.
    tasks:
      - {id: b1, text: "Orders and revenue (delivered orders) per month"}
      - {id: b2, text: "Active customers per month (distinct customers who ordered)"}
      - {id: b3, text: "Average order value per month"}
  - name: Intermediate
    description: Growth and new customers.
    tasks:
      - {id: i1, text: "New customers per month (customers whose first order was in that month)"}
      - {id: i2, text: "Revenue growth vs the previous month in %"}
      - {id: i3, text: "Year-to-date revenue (running total that restarts each year)"}
      - {id: i4, text: "All KPIs combined in one query built from CTEs, one row per month"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Use a generated calendar so months with no orders still appear"}
      - {id: e2, text: "Same month last year comparison (LAG with offset 12)"}
      - {id: e3, text: "Save the final query as a VIEW called monthly_kpis"}
---

## Goal

KPI (key performance indicator) tables are the backbone of business reporting. Building one teaches you to
**decompose**: each KPI is a small CTE, and the final query joins them by month.

## Hints

- Step 1: `order_values` - one row per delivered order with its month, customer and value.
- Step 2: `first_orders` - each customer's first order month (`MIN(substr(order_date, 1, 7))`, all statuses).
- Step 3: `monthly` - aggregate step 1 per month; join the count of new customers from step 2.
- Step 4: final SELECT with `LAG(revenue) OVER (ORDER BY month)` and
  `SUM(revenue) OVER (PARTITION BY substr(month, 1, 4) ORDER BY month)` for year-to-date.

## Sample solution

```sql
WITH order_values AS (
    SELECT o.id, o.customer_id, substr(o.order_date, 1, 7) AS month,
           SUM(i.quantity * i.unit_price * (1 - i.discount)) AS value
    FROM orders AS o
    JOIN order_items AS i ON i.order_id = o.id
    WHERE o.status = 'delivered'
    GROUP BY o.id, o.customer_id, month
),
first_orders AS (
    SELECT customer_id, MIN(substr(order_date, 1, 7)) AS first_month
    FROM orders
    GROUP BY customer_id
),
new_customers AS (
    SELECT first_month AS month, COUNT(*) AS new_customers
    FROM first_orders
    GROUP BY first_month
),
monthly AS (
    SELECT month, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS active_customers,
           SUM(value) AS revenue
    FROM order_values
    GROUP BY month
)
SELECT m.month,
       m.orders,
       m.active_customers,
       COALESCE(n.new_customers, 0) AS new_customers,
       ROUND(m.revenue, 2) AS revenue,
       ROUND(m.revenue / m.orders, 2) AS avg_order_value,
       ROUND(100.0 * (m.revenue - LAG(m.revenue) OVER (ORDER BY m.month))
             / LAG(m.revenue) OVER (ORDER BY m.month), 1) AS growth_pct,
       ROUND(SUM(m.revenue) OVER (PARTITION BY substr(m.month, 1, 4) ORDER BY m.month), 2) AS revenue_ytd
FROM monthly AS m
LEFT JOIN new_customers AS n ON n.month = m.month
ORDER BY m.month;
```

## Check your work

Run each CTE on its own first (`WITH ... SELECT * FROM order_values LIMIT 10`). The sum of `new_customers`
across all months should equal the number of customers who have ever ordered. The `revenue_ytd` of December
2025 should equal the total 2025 revenue.
