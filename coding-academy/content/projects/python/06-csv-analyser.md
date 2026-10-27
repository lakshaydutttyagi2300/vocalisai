---
id: proj-py-06-csv-analyser
title: CSV data analyser
track: python
order: 6
difficulty: intermediate
summary: Read a CSV file of sales, clean it, and produce a report - totals, averages, best sellers, monthly trend and rows that had problems - using only the standard library.
internet: false
skills: [py-7-2-csv-json, py-8-2-comprehensions-lambda-sorting, py-8-1-modules-and-stdlib, py-5-3-dates-and-numbers, py-7-3-exceptions, py-11-3-type-hints-dataclasses]
starter: |
  import csv
  from pathlib import Path

  SAMPLE = """date,product,region,quantity,unit_price
  2026-01-05,Kettle,North,2,25.00
  2026-01-09,Mug,South,6,4.50
  2026-02-11,Kettle,South,1,25.00
  2026-02-14,Toaster,North,1,30.00
  2026-02-20,Mug,North,abc,4.50
  2026-03-02,Toaster,South,3,30.00
  """
  Path("sales.csv").write_text(SAMPLE, encoding="utf-8")

  # your code here: read sales.csv and print a report
stages:
  - name: Beginner
    description: Read and total.
    tasks:
      - {id: b1, text: "The program reads sales.csv with csv.DictReader"}
      - {id: b2, text: "It converts quantity and unit_price to numbers and calculates each row's revenue"}
      - {id: b3, text: "It prints the number of rows and the total revenue"}
  - name: Intermediate
    description: A real report.
    tasks:
      - {id: i1, text: "Rows that can't be converted are skipped and listed as problems (with their line number)"}
      - {id: i2, text: "Revenue per product, sorted from best to worst seller"}
      - {id: i3, text: "Revenue per month (YYYY-MM) in date order"}
      - {id: i4, text: "The analysis is split into functions: load_rows, revenue_by, print_report"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Write the report to report.txt and the per-product summary to summary.csv"}
      - {id: e2, text: "Let the user choose the column to group by (product, region or month)"}
      - {id: e3, text: "Use a dataclass for a sale with type hints"}
      - {id: e4, text: "Draw a text bar chart (one # per £10) of revenue per product"}
---

## Goal

Turn a raw CSV export into useful answers - the everyday job of a data analyst - and learn to deal with
the messy rows that real data always contains.

## Example run

```text
Read 6 rows, 5 valid, 1 with problems.
Total revenue: 222.00

Revenue by product:
  Toaster      120.00
  Kettle        75.00
  Mug           27.00

Revenue by month:
  2026-01       77.00
  2026-02       55.00
  2026-03       90.00

Problems:
  line 6: quantity 'abc' is not a whole number
```

## Step-by-step plan

1. Write the sample file (the starter does it), then open it with `csv.DictReader`.
2. `load_rows(path)` returns `(rows, problems)`: convert numbers inside `try/except ValueError`; a failed
   row goes into `problems` with its line number.
3. `revenue_by(rows, key_function)` returns a dictionary of totals; reuse it for products, regions and months.
4. `print_report(...)` formats everything with aligned columns.

## Hints

- With `DictReader`, the header is line 1, so the first data row is line 2: `enumerate(reader, start=2)`.
- Month from a date: `row["date"][:7]`.
- Sort a dictionary by value, largest first: `sorted(totals.items(), key=lambda kv: kv[1], reverse=True)`.
- `revenue_by(rows, lambda r: r["product"])` - pass a small function that picks the grouping value.

## Sample solution

```python
import csv
from pathlib import Path

SAMPLE = """date,product,region,quantity,unit_price
2026-01-05,Kettle,North,2,25.00
2026-01-09,Mug,South,6,4.50
2026-02-11,Kettle,South,1,25.00
2026-02-14,Toaster,North,1,30.00
2026-02-20,Mug,North,abc,4.50
2026-03-02,Toaster,South,3,30.00
"""


def load_rows(path):
    rows, problems = [], []
    with open(path, newline="", encoding="utf-8") as f:
        for line_number, row in enumerate(csv.DictReader(f), start=2):
            try:
                quantity = int(row["quantity"])
            except ValueError:
                problems.append(f"line {line_number}: quantity {row['quantity']!r} is not a whole number")
                continue
            try:
                price = float(row["unit_price"])
            except ValueError:
                problems.append(f"line {line_number}: unit_price {row['unit_price']!r} is not a number")
                continue
            rows.append({**row, "quantity": quantity, "unit_price": price, "revenue": quantity * price})
    return rows, problems


def revenue_by(rows, key):
    totals = {}
    for row in rows:
        totals[key(row)] = totals.get(key(row), 0) + row["revenue"]
    return totals


def print_report(rows, problems):
    print(f"Read {len(rows) + len(problems)} rows, {len(rows)} valid, {len(problems)} with problems.")
    print(f"Total revenue: {sum(r['revenue'] for r in rows):.2f}")
    print("\nRevenue by product:")
    by_product = revenue_by(rows, lambda r: r["product"])
    for product, total in sorted(by_product.items(), key=lambda kv: kv[1], reverse=True):
        print(f"  {product:<10}{total:>10.2f}")
    print("\nRevenue by month:")
    for month, total in sorted(revenue_by(rows, lambda r: r["date"][:7]).items()):
        print(f"  {month:<10}{total:>10.2f}")
    if problems:
        print("\nProblems:")
        for problem in problems:
            print("  " + problem)


Path("sales.csv").write_text(SAMPLE, encoding="utf-8")
print_report(*load_rows("sales.csv"))
```

## Test your program

Add rows with an empty quantity, a negative price, a missing column and an extra blank line at the end. Decide
how each should be handled - skip and report, or accept - and make sure the totals still add up (check one by
hand).
