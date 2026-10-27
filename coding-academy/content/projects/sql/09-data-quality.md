---
id: proj-sql-09-data-quality
title: Data quality investigation
track: sql
order: 9
difficulty: intermediate
summary: Investigate a messy customer list - duplicates, missing values, inconsistent spelling, impossible numbers - measure each problem, then build a cleaned table.
dataset: quality
internet: false
skills: [sql-1-3-in-between-like-null, sql-2-2-group-by-having, sql-5-2-text-date-number-functions, sql-5-1-case-and-conditional-aggregation, sql-3-2-create-alter-drop, sql-6-1-ranking-window-functions]
stages:
  - name: Beginner
    description: Measure the mess.
    tasks:
      - {id: b1, text: "Count missing values (NULL or empty) in every column"}
      - {id: b2, text: "Find impossible values: negative total_spend"}
      - {id: b3, text: "List the distinct city spellings and how often each appears"}
  - name: Intermediate
    description: Find duplicates and clean.
    tasks:
      - {id: i1, text: "Find exact duplicate rows (same name, email, phone, city, date and spend)"}
      - {id: i2, text: "Find likely duplicates by email after LOWER(TRIM(email))"}
      - {id: i3, text: "Create customers_clean: trimmed, consistently capitalised cities, lower-case emails, one row per email, negative spends set to NULL"}
      - {id: i4, text: "A data quality summary: rows before and after cleaning and how many values were fixed"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Check phone numbers follow one pattern (GLOB) and count the exceptions"}
      - {id: e2, text: "Check every city belongs to the right country with a small lookup table"}
      - {id: e3, text: "Write a short data quality report for the data owner: problems, counts, suggested fixes"}
---

## Goal

Before you trust any analysis, you check the data. This project uses the deliberately messy **quality**
database (`customers_raw`) - real data looks like this more often than you'd hope. Never edit the raw table:
build a **clean copy**, so you can always show what changed.

## Hints

- Missing values per column in one query: `SUM(CASE WHEN email IS NULL OR TRIM(email) = '' THEN 1 ELSE 0 END)`.
- Capitalise a single-word city: `UPPER(SUBSTR(TRIM(city), 1, 1)) || LOWER(SUBSTR(TRIM(city), 2))` - multi-word
  cities like "new york" need a mapping (a CASE or a small lookup table).
- Exact duplicates: `GROUP BY` every column except `id` and keep groups with `COUNT(*) > 1`.
- One row per email: `ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id)` and keep `rn = 1`.
- Rows without an email can't be matched - keep them all.

## Sample solution

```sql
-- 1. Missing values per column
SELECT COUNT(*) AS total_rows,
       SUM(CASE WHEN first_name IS NULL OR TRIM(first_name) = '' THEN 1 ELSE 0 END) AS missing_first_name,
       SUM(CASE WHEN email IS NULL OR TRIM(email) = '' THEN 1 ELSE 0 END) AS missing_email,
       SUM(CASE WHEN phone IS NULL OR TRIM(phone) = '' THEN 1 ELSE 0 END) AS missing_phone,
       SUM(CASE WHEN city IS NULL OR TRIM(city) = '' THEN 1 ELSE 0 END) AS missing_city,
       SUM(CASE WHEN total_spend IS NULL THEN 1 ELSE 0 END) AS missing_spend
FROM customers_raw;
```

```sql
-- 2. Impossible values
SELECT id, first_name, last_name, total_spend
FROM customers_raw
WHERE total_spend < 0;
```

```sql
-- 3. City spellings
SELECT city, COUNT(*) AS rows
FROM customers_raw
GROUP BY city
ORDER BY LOWER(TRIM(city)), city;
```

```sql
-- 4. Exact duplicates
SELECT first_name, last_name, email, phone, city, joined_on, total_spend, COUNT(*) AS copies, GROUP_CONCAT(id) AS ids
FROM customers_raw
GROUP BY first_name, last_name, email, phone, city, joined_on, total_spend
HAVING COUNT(*) > 1;
```

```sql
-- 5. Likely duplicates by normalised email
SELECT LOWER(TRIM(email)) AS email_clean, COUNT(*) AS rows, GROUP_CONCAT(id) AS ids
FROM customers_raw
WHERE email IS NOT NULL
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1;
```

```sql
-- 6. Build the clean table
DROP TABLE IF EXISTS customers_clean;
CREATE TABLE customers_clean AS
WITH tidy AS (
    SELECT id,
           TRIM(first_name) AS first_name,
           TRIM(last_name) AS last_name,
           LOWER(TRIM(email)) AS email,
           phone,
           CASE LOWER(TRIM(city))
               WHEN 'new york' THEN 'New York'
               ELSE UPPER(SUBSTR(TRIM(city), 1, 1)) || LOWER(SUBSTR(TRIM(city), 2))
           END AS city,
           country,
           joined_on,
           CASE WHEN total_spend < 0 THEN NULL ELSE total_spend END AS total_spend
    FROM customers_raw
),
numbered AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE(email, 'no-email-' || id) ORDER BY id) AS rn
    FROM tidy
)
SELECT id, first_name, last_name, email, phone, city, country, joined_on, total_spend
FROM numbered
WHERE rn = 1;
```

```sql
-- 7. Before / after summary
SELECT (SELECT COUNT(*) FROM customers_raw) AS rows_before,
       (SELECT COUNT(*) FROM customers_clean) AS rows_after,
       (SELECT COUNT(DISTINCT city) FROM customers_raw) AS city_spellings_before,
       (SELECT COUNT(DISTINCT city) FROM customers_clean) AS city_spellings_after,
       (SELECT COUNT(*) FROM customers_raw WHERE total_spend < 0) AS negative_spends_cleared;
```

## Check your work

After cleaning, query 3 run against `customers_clean` should show one spelling per city, query 5 should find no
duplicates, and `rows_before - rows_after` should equal the number of duplicate rows you found. Write down every
cleaning rule you applied - other people need to know how the clean table was made.
