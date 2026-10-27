---
id: proj-sql-05-inventory
title: Inventory management
track: sql
order: 5
difficulty: intermediate
summary: Keep a warehouse business running - stock value, what to reorder, warehouse usage, supplier performance and a reconciliation of stock movements - with the Inventory database.
dataset: inventory
internet: false
skills: [sql-4-1-inner-join, sql-4-2-left-join-and-nulls, sql-5-1-case-and-conditional-aggregation, sql-5-4-ctes-and-set-operations, sql-3-1-insert-update-delete, sql-7-3-transactions-and-acid]
stages:
  - name: Beginner
    description: Current stock.
    tasks:
      - {id: b1, text: "Total quantity of each item across all warehouses, with SKU and name"}
      - {id: b2, text: "Stock value (quantity × unit_cost) per warehouse and in total"}
      - {id: b3, text: "Items whose total stock is below their reorder level - the reorder list"}
  - name: Intermediate
    description: Movements and suppliers.
    tasks:
      - {id: i1, text: "Units in and out per month (purchases vs sales vs damaged vs transfers)"}
      - {id: i2, text: "Warehouse usage: total units vs capacity, as a percentage"}
      - {id: i3, text: "Value of the reorder list per supplier, to plan purchase orders"}
      - {id: i4, text: "The top 5 best-selling items by units sold in 2026"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Record a delivery in a transaction: insert a stock movement and update stock_levels together"}
      - {id: e2, text: "Items with no sales in the last 60 days (slow movers)"}
      - {id: e3, text: "Damaged goods as a % of units received, per supplier"}
---

## Goal

An inventory database answers "what do we have, where, what is it worth, and what must we order?". This project
also shows a classic SQL use: a **reorder report** that tells people what to do today.

## The tables

`items` (with `reorder_level` and `unit_cost`), `suppliers`, `warehouses` (with `capacity`),
`stock_levels` (current quantity of each item in each warehouse) and `stock_movements` (every in/out with a
`reason`: purchase, sale, damaged, transfer).

## Hints

- Total per item: `SUM(quantity)` from `stock_levels` grouped by item; LEFT JOIN from `items` so items with no
  stock rows still appear.
- Reorder list: `HAVING COALESCE(SUM(s.quantity), 0) < i.reorder_level`.
- Suggested order quantity: e.g. `2 * reorder_level - stock`.
- Movements per month: conditional sums by `reason` with `strftime('%Y-%m', movement_date)`.

## Sample solution

```sql
-- 1. Total stock per item
SELECT i.sku, i.name, COALESCE(SUM(s.quantity), 0) AS total_stock
FROM items AS i
LEFT JOIN stock_levels AS s ON s.item_id = i.id
GROUP BY i.id, i.sku, i.name
ORDER BY i.sku;
```

```sql
-- 2. Stock value per warehouse (and a total row)
SELECT w.name AS warehouse, ROUND(SUM(s.quantity * i.unit_cost), 2) AS stock_value
FROM stock_levels AS s
JOIN items AS i ON i.id = s.item_id
JOIN warehouses AS w ON w.id = s.warehouse_id
GROUP BY w.name
UNION ALL
SELECT 'TOTAL', ROUND(SUM(s.quantity * i.unit_cost), 2)
FROM stock_levels AS s
JOIN items AS i ON i.id = s.item_id;
```

```sql
-- 3. Reorder list with a suggested quantity
SELECT i.sku, i.name, COALESCE(SUM(s.quantity), 0) AS stock, i.reorder_level,
       2 * i.reorder_level - COALESCE(SUM(s.quantity), 0) AS suggested_order
FROM items AS i
LEFT JOIN stock_levels AS s ON s.item_id = i.id
GROUP BY i.id, i.sku, i.name, i.reorder_level
HAVING COALESCE(SUM(s.quantity), 0) < i.reorder_level
ORDER BY suggested_order DESC;
```

```sql
-- 4. Units in and out per month by reason
SELECT strftime('%Y-%m', movement_date) AS month,
       SUM(CASE WHEN reason = 'purchase' THEN quantity ELSE 0 END) AS purchased,
       SUM(CASE WHEN reason = 'sale' THEN quantity ELSE 0 END) AS sold,
       SUM(CASE WHEN reason = 'damaged' THEN quantity ELSE 0 END) AS damaged,
       SUM(CASE WHEN reason = 'transfer' THEN quantity ELSE 0 END) AS transferred
FROM stock_movements
GROUP BY month
ORDER BY month;
```

```sql
-- 5. Warehouse usage
SELECT w.name, w.capacity, SUM(s.quantity) AS units,
       ROUND(100.0 * SUM(s.quantity) / w.capacity, 1) AS used_pct
FROM warehouses AS w
JOIN stock_levels AS s ON s.warehouse_id = w.id
GROUP BY w.id, w.name, w.capacity
ORDER BY used_pct DESC;
```

```sql
-- 6. Reorder value per supplier
WITH reorder AS (
    SELECT i.id, i.supplier_id, i.unit_cost,
           2 * i.reorder_level - COALESCE(SUM(s.quantity), 0) AS order_qty
    FROM items AS i
    LEFT JOIN stock_levels AS s ON s.item_id = i.id
    GROUP BY i.id, i.supplier_id, i.unit_cost, i.reorder_level
    HAVING COALESCE(SUM(s.quantity), 0) < i.reorder_level
)
SELECT su.name AS supplier, su.email, COUNT(*) AS items, ROUND(SUM(r.order_qty * r.unit_cost), 2) AS order_value
FROM reorder AS r
JOIN suppliers AS su ON su.id = r.supplier_id
GROUP BY su.id, su.name, su.email
ORDER BY order_value DESC;
```

```sql
-- 7. Top 5 sellers in 2026
SELECT i.sku, i.name, SUM(m.quantity) AS units_sold
FROM stock_movements AS m
JOIN items AS i ON i.id = m.item_id
WHERE m.reason = 'sale' AND m.movement_date >= '2026-01-01'
GROUP BY i.id, i.sku, i.name
ORDER BY units_sold DESC, i.sku
LIMIT 5;
```

## Check your work

The TOTAL row in query 2 should equal the sum of the warehouse rows. Pick one item from the reorder list and
check its stock by hand with `SELECT * FROM stock_levels WHERE item_id = ...`.
