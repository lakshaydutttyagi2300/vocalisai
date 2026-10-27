---
id: proj-sql-04-expense-tracking
title: Personal finance review
track: sql
order: 4
difficulty: beginner
summary: Review 18 months of personal transactions - income, spending by category, budgets, monthly savings and unusual purchases - using the Expenses database.
dataset: expenses
internet: false
skills: [sql-2-2-group-by-having, sql-4-1-inner-join, sql-5-1-case-and-conditional-aggregation, sql-5-2-text-date-number-functions, sql-6-2-lag-lead-running-totals]
stages:
  - name: Beginner
    description: Where does the money go?
    tasks:
      - {id: b1, text: "Total income, total spending and the difference for the whole period"}
      - {id: b2, text: "Spending per category, largest first"}
      - {id: b3, text: "The 10 biggest single expenses with date, description and category"}
  - name: Intermediate
    description: Monthly view and budgets.
    tasks:
      - {id: i1, text: "Income, spending and savings per month"}
      - {id: i2, text: "Savings rate per month (savings ÷ income, in %) and the running total of savings"}
      - {id: i3, text: "For each budgeted category: average monthly spending vs budget, and how many months were over budget"}
      - {id: i4, text: "Spending per account (bank, card, cash) per year"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Find 'unusual' expenses: more than twice the category's average transaction"}
      - {id: e2, text: "Weekday vs weekend spending on eating out"}
      - {id: e3, text: "Turn your findings into three concrete money-saving suggestions"}
---

## Goal

Use SQL on your own (well, realistic sample) finances. In the Expenses database, **positive amounts are money
in** and **negative amounts are money out**. The data runs from January 2025 to June 2026.

## Hints

- Spending as positive numbers: `-SUM(amount)` on rows with `amount < 0`.
- Monthly: `strftime('%Y-%m', tx_date) AS month` and `GROUP BY month`.
- Over-budget months: first a CTE of spending per category per month, then compare with `budgets.monthly_amount`
  and count with `SUM(CASE WHEN spent > monthly_amount THEN 1 ELSE 0 END)`.
- Running total of savings: `SUM(savings) OVER (ORDER BY month)` over the monthly CTE.

## Sample solution

```sql
-- 1. The whole period
SELECT ROUND(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 2) AS income,
       ROUND(-SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 2) AS spending,
       ROUND(SUM(amount), 2) AS saved
FROM transactions;
```

```sql
-- 2. Spending per category
SELECT c.name AS category, ROUND(-SUM(t.amount), 2) AS spent
FROM transactions AS t
JOIN categories AS c ON c.id = t.category_id
WHERE t.amount < 0
GROUP BY c.name
ORDER BY spent DESC;
```

```sql
-- 3. Ten biggest expenses
SELECT t.tx_date, t.description, c.name AS category, -t.amount AS amount
FROM transactions AS t
JOIN categories AS c ON c.id = t.category_id
WHERE t.amount < 0
ORDER BY t.amount
LIMIT 10;
```

```sql
-- 4-5. Monthly savings, savings rate and running total
WITH monthly AS (
    SELECT strftime('%Y-%m', tx_date) AS month,
           SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
           -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS spending
    FROM transactions
    GROUP BY month
)
SELECT month, ROUND(income, 2) AS income, ROUND(spending, 2) AS spending,
       ROUND(income - spending, 2) AS savings,
       ROUND(100.0 * (income - spending) / NULLIF(income, 0), 1) AS savings_rate_pct,
       ROUND(SUM(income - spending) OVER (ORDER BY month), 2) AS saved_so_far
FROM monthly
ORDER BY month;
```

```sql
-- 6. Budgets: average month vs budget and months over budget
WITH monthly_spend AS (
    SELECT category_id, strftime('%Y-%m', tx_date) AS month, -SUM(amount) AS spent
    FROM transactions
    WHERE amount < 0
    GROUP BY category_id, month
)
SELECT c.name AS category, b.monthly_amount AS budget,
       ROUND(AVG(m.spent), 2) AS avg_month,
       SUM(CASE WHEN m.spent > b.monthly_amount THEN 1 ELSE 0 END) AS months_over_budget
FROM budgets AS b
JOIN categories AS c ON c.id = b.category_id
JOIN monthly_spend AS m ON m.category_id = b.category_id
GROUP BY c.name, b.monthly_amount
ORDER BY months_over_budget DESC, category;
```

```sql
-- 7. Spending per account type per year
SELECT strftime('%Y', t.tx_date) AS year, a.kind AS account_type,
       ROUND(-SUM(t.amount), 2) AS spent
FROM transactions AS t
JOIN accounts AS a ON a.id = t.account_id
WHERE t.amount < 0
GROUP BY year, a.kind
ORDER BY year, spent DESC;
```

## Check your work

Income minus spending in query 1 must equal the final `saved_so_far` in query 4-5. If a month shows a negative
savings rate, find out why with a query of that month's largest expenses.
