---
id: proj-py-04-expense-tracker
title: Personal expense tracker
track: python
order: 4
difficulty: intermediate
summary: A menu-driven program to record expenses, list and summarise them by category and month, and save everything to a CSV file between runs.
internet: false
skills: [py-4-4-dictionaries, py-5-3-dates-and-numbers, py-6-3-problem-decomposition, py-7-2-csv-json, py-7-3-exceptions]
demo_input: |
  add
  2026-06-03
  groceries
  23.40
  Supermarket
  add
  2026-06-05
  transport
  abc
  4.80
  Bus
  add
  2026-07-01
  groceries
  12
  Market
  list
  summary
  month
  2026-06
  quit
starter: |
  import csv
  from pathlib import Path

  FILE = Path("expenses.csv")
  expenses = []   # each expense: {"date": "2026-06-03", "category": "groceries", "amount": 23.4, "note": "..."}

  # Stage 1: add expenses and list them
stages:
  - name: Beginner
    description: Record and see expenses.
    tasks:
      - {id: b1, text: "A menu offers add, list and quit"}
      - {id: b2, text: "add asks for date, category, amount and a note and stores the expense"}
      - {id: b3, text: "list prints all expenses in a neat table with the total at the bottom"}
  - name: Intermediate
    description: Save, validate and summarise.
    tasks:
      - {id: i1, text: "Expenses are saved to expenses.csv and loaded again when the program starts"}
      - {id: i2, text: "Invalid dates (not YYYY-MM-DD) and amounts are rejected with a message and asked again"}
      - {id: i3, text: "summary shows the total per category, largest first"}
      - {id: i4, text: "month asks for a month (YYYY-MM) and shows that month's expenses and total"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Monthly budgets per category with a warning when a budget is exceeded"}
      - {id: e2, text: "Delete or edit an expense by its number"}
      - {id: e3, text: "Export a monthly report to a text file"}
      - {id: e4, text: "Move the storage to SQLite (see the database-backed app project)"}
---

## Goal

A tool you can actually use to track your own spending. It combines input validation, dictionaries, dates,
files and summaries - the core of countless real programs.

## Example run

```text
Command (add/list/summary/month/quit): add
Date (YYYY-MM-DD): 2026-06-03
Category: groceries
Amount: 23.40
Note: Supermarket
Saved.
Command (add/list/summary/month/quit): list
#   Date        Category     Amount  Note
1   2026-06-03  groceries     23.40  Supermarket
2   2026-06-05  transport      4.80  Bus
                 Total:       28.20
```

## Step-by-step plan

1. Decide the data: a list of dictionaries with `date`, `category`, `amount`, `note`.
2. Write small functions: `ask_date()`, `ask_amount()`, `add_expense()`, `show_table(rows)`,
   `summary_by_category(rows)`, `load()`, `save()`.
3. A `while True` menu loop calls them; `quit` breaks.
4. Save after every change (`csv.DictWriter`); load at start (`csv.DictReader`, converting amounts back to
   float).
5. Add the month filter: `row["date"].startswith("2026-06")`.

## Hints

- `datetime.date.fromisoformat(text)` raises `ValueError` for an invalid date - perfect for validation.
- Keep money as floats rounded with `round(x, 2)` for display (or store whole pennies as ints for exact maths).
- Format columns with f-strings: `f"{amount:>8.2f}"` right-aligns in 8 characters with 2 decimals.
- CSV files store text: convert `amount` with `float(...)` after loading.

## Sample solution

```python
import csv
from datetime import date
from pathlib import Path

FILE = Path("expenses.csv")
FIELDS = ["date", "category", "amount", "note"]


def load():
    if not FILE.exists():
        return []
    with FILE.open(newline="", encoding="utf-8") as f:
        return [{**row, "amount": float(row["amount"])} for row in csv.DictReader(f)]


def save(rows):
    with FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def ask_date(prompt="Date (YYYY-MM-DD): "):
    while True:
        text = input(prompt).strip()
        try:
            return date.fromisoformat(text).isoformat()
        except ValueError:
            print("Please use the format YYYY-MM-DD, e.g. 2026-06-03.")


def ask_amount():
    while True:
        text = input("Amount: ").strip()
        try:
            amount = round(float(text), 2)
        except ValueError:
            print("Please type a number, e.g. 12.50.")
            continue
        if amount > 0:
            return amount
        print("The amount must be more than 0.")


def show_table(rows):
    print(f"{'#':<4}{'Date':<12}{'Category':<12}{'Amount':>8}  Note")
    for number, row in enumerate(rows, start=1):
        print(f"{number:<4}{row['date']:<12}{row['category']:<12}{row['amount']:>8.2f}  {row['note']}")
    print(f"{'':<16}{'Total:':<12}{sum(r['amount'] for r in rows):>8.2f}")


def summary_by_category(rows):
    totals = {}
    for row in rows:
        totals[row["category"]] = totals.get(row["category"], 0) + row["amount"]
    return sorted(totals.items(), key=lambda pair: pair[1], reverse=True)


def main():
    rows = load()
    print(f"Loaded {len(rows)} expenses.")
    while True:
        command = input("Command (add/list/summary/month/quit): ").strip().lower()
        if command == "add":
            rows.append({"date": ask_date(), "category": input("Category: ").strip().lower() or "other",
                         "amount": ask_amount(), "note": input("Note: ").strip()})
            save(rows)
            print("Saved.")
        elif command == "list":
            show_table(rows)
        elif command == "summary":
            for category, total in summary_by_category(rows):
                print(f"{category:<12}{total:>8.2f}")
        elif command == "month":
            month = input("Month (YYYY-MM): ").strip()
            show_table([r for r in rows if r["date"].startswith(month)])
        elif command == "quit":
            print("Goodbye!")
            break
        else:
            print("Unknown command.")


FILE.unlink(missing_ok=True)   # start fresh for this demo - remove this line to keep your data
main()
```

## Test your program

Add a few expenses, quit, run again and check they're still there. Try invalid dates (`2026-13-01`,
`03/06/2026`), negative and non-numeric amounts, an empty category, and a month with no expenses.
