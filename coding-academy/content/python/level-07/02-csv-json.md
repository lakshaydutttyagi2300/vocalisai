---
id: py-7-2-csv-json
title: Working with CSV and JSON files
track: python
level: 7
order: 2
minutes: 45
summary: Read and write the two most common data file formats - CSV tables (Excel-friendly) with the csv module, and structured JSON with the json module.
objectives:
  - Explain what CSV and JSON files are and when each is used
  - Read CSV files into lists of dictionaries with csv.DictReader
  - Write CSV files with csv.DictWriter
  - Convert between Python data and JSON with json.dump / json.load (and dumps / loads)
  - Convert text values from CSV into numbers before calculating
prerequisites: [py-7-1-reading-writing-files, py-4-5-nested-and-choosing]
tags: [csv, json, DictReader, DictWriter, json.load, json.dump, data file, excel, serialisation]
---

## Simple explanation

**CSV** (Comma-Separated Values) is a plain-text table. Each line is a row; commas separate the columns; the
first line usually holds the column names:

```text
date,description,amount
2026-10-01,Groceries,42.50
2026-10-02,Bus ticket,2.80
```

Excel and Google Sheets open CSV files directly. Python's **`csv`** module reads them safely (handling commas
inside quotes, for example `"Smith, John"`).

**JSON** (JavaScript Object Notation) stores nested data - dictionaries and lists - as text:

```json
{"name": "Asha", "skills": ["python", "sql"], "active": true}
```

JSON is the language of web APIs and many settings files. Python's **`json`** module converts between JSON text
and Python dictionaries/lists.

## Real-world analogy

- **CSV** is a **spreadsheet saved as plain text** - perfect for tables where every row has the same columns.
- **JSON** is like a **packed suitcase with labelled compartments, some containing smaller bags** - perfect for
  nested, varied data.

## Technical definition

- `csv.reader(f)` yields each row as a **list of strings**; `csv.DictReader(f)` yields each row as a
  **dict** keyed by the header. **All values are strings** - convert with `int()`/`float()`.
- `csv.writer(f).writerow(list)`; `csv.DictWriter(f, fieldnames=[...])` with `.writeheader()` and
  `.writerow(dict)` / `.writerows(list_of_dicts)`.
- Open CSV files with `newline=""` (prevents blank lines on Windows) and `encoding="utf-8"`.
- `json.dump(data, f, indent=2)` writes to a file; `json.load(f)` reads from a file.
  `json.dumps(data)` / `json.loads(text)` work with strings.
- JSON ↔ Python: object ↔ dict, array ↔ list, string ↔ str, number ↔ int/float, `true/false` ↔ `True/False`,
  `null` ↔ `None`. JSON keys are always strings; tuples become lists; dates must be converted to strings.

## Step-by-step examples

**Example 1 - write a CSV file**

```python
import csv

rows = [
    {"date": "2026-10-01", "description": "Groceries", "amount": 42.5},
    {"date": "2026-10-02", "description": "Bus ticket", "amount": 2.8},
]
with open("expenses.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["date", "description", "amount"])
    writer.writeheader()
    writer.writerows(rows)
```

**Example 2 - read it back and total it**

```python
import csv

total = 0
with open("expenses.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        print(row["date"], row["description"], row["amount"])
        total += float(row["amount"])        # values are strings!
print(f"Total: {total:.2f}")
```

Output:

```text
2026-10-01 Groceries 42.5
2026-10-02 Bus ticket 2.8
Total: 45.30
```

**Example 3 - save and load settings as JSON**

```python
import json

settings = {"theme": "dark", "font_size": 14, "recent": ["a.txt", "b.txt"]}
with open("settings.json", "w", encoding="utf-8") as f:
    json.dump(settings, f, indent=2)

with open("settings.json", encoding="utf-8") as f:
    loaded = json.load(f)
print(loaded["recent"][0], loaded["font_size"] + 1)   # a.txt 15
```

The file looks like:

```json
{
  "theme": "dark",
  "font_size": 14,
  "recent": [
    "a.txt",
    "b.txt"
  ]
}
```

**Example 4 - JSON text from an API**

```python
import json

text = '{"city": "Pune", "temp_c": 31.5, "rain": false, "forecast": [30, 29, 33]}'
data = json.loads(text)
print(data["city"], max(data["forecast"]), data["rain"])   # Pune 33 False
```

## Common mistakes

- **Doing maths with CSV values without converting** - `"42.5" + "2.8"` joins text.
- **Forgetting `newline=""`** when writing CSV on Windows → blank lines between rows.
- **Splitting CSV lines with `split(",")`** - breaks on values like `"Smith, John"`. Use the `csv` module.
- **Writing non-JSON values**: dates, sets and custom objects raise `TypeError: ... is not JSON serializable`.
  Convert them (dates → `isoformat()`, sets → lists).
- **Mixing up `load`/`loads`**: `load(file)`, `loads(string)` ("s" for string).
- **JSON syntax** is stricter than Python: double quotes only, no trailing commas, `true`/`false`/`null`.

## Practical application

Bank statements and exports from apps usually come as CSV; web APIs and configuration use JSON. The CSV analyser
project reads a sales CSV and summarises it; the expense tracker saves its data as JSON or CSV; the API project
parses JSON responses.

## Revision notes

- CSV = text table. `csv.DictReader(f)` → dict per row (strings!); `csv.DictWriter(f, fieldnames)` +
  `writeheader()` + `writerows()`. Open with `newline="", encoding="utf-8"`.
- JSON = nested data. `json.dump(obj, f, indent=2)`, `json.load(f)`; `dumps`/`loads` for strings.
- JSON: object=dict, array=list, true/false/null = True/False/None. Keys are strings.
- Convert CSV text to numbers before calculating.

```exercise
id: write-csv
title: Write a CSV file
difficulty: beginner
instructions: |
  Write the `students` list to `students.csv` with the header `name,score` using `csv.DictWriter`. Then print the
  file's contents with `print(open("students.csv", encoding="utf-8").read(), end="")`:

  ```text
  name,score
  Asha,88
  Ben,72
  ```
starter: |
  import csv
  students = [{"name": "Asha", "score": 88}, {"name": "Ben", "score": 72}]
hints:
  - "`with open(\"students.csv\", \"w\", newline=\"\", encoding=\"utf-8\") as f:`"
  - "`writer = csv.DictWriter(f, fieldnames=[\"name\", \"score\"])`, then `writer.writeheader()` and `writer.writerows(students)`."
solution: |
  import csv
  students = [{"name": "Asha", "score": 88}, {"name": "Ben", "score": 72}]
  with open("students.csv", "w", newline="", encoding="utf-8") as f:
      writer = csv.DictWriter(f, fieldnames=["name", "score"])
      writer.writeheader()
      writer.writerows(students)
  print(open("students.csv", encoding="utf-8").read(), end="")
explanation: |
  DictWriter writes the header row from `fieldnames` and one line per dictionary. The csv module adds the commas
  and line endings for you.
check:
  expected: |
    name,score
    Asha,88
    Ben,72
  requires: ["call:DictWriter"]
```

```exercise
id: read-csv-total
title: Total a CSV column
difficulty: beginner
instructions: |
  The starter creates `sales.csv`. Read it with `csv.DictReader` and print the total of the `amount` column with
  two decimals, and the number of sales:

  ```text
  Sales: 4
  Total: 157.25
  ```
starter: |
  import csv
  with open("sales.csv", "w", newline="", encoding="utf-8") as f:
      f.write("date,item,amount\n2026-10-01,Pen,2.50\n2026-10-01,Bag,45.00\n2026-10-02,Lamp,89.75\n2026-10-03,Mug,20.00\n")

  # your code below
hints:
  - "`for row in csv.DictReader(f):` gives dictionaries like `{\"date\": ..., \"item\": ..., \"amount\": \"2.50\"}`."
  - "Convert with `float(row[\"amount\"])` before adding."
solution: |
  import csv
  with open("sales.csv", "w", newline="", encoding="utf-8") as f:
      f.write("date,item,amount\n2026-10-01,Pen,2.50\n2026-10-01,Bag,45.00\n2026-10-02,Lamp,89.75\n2026-10-03,Mug,20.00\n")

  total = 0
  count = 0
  with open("sales.csv", newline="", encoding="utf-8") as f:
      for row in csv.DictReader(f):
          total += float(row["amount"])
          count += 1
  print("Sales:", count)
  print(f"Total: {total:.2f}")
explanation: |
  DictReader uses the first line as the keys. Every value is a string, so `float()` is needed before adding.
check:
  expected: |
    Sales: 4
    Total: 157.25
  requires: ["call:DictReader"]
```

```exercise
id: json-settings
title: Save and load settings with JSON
difficulty: intermediate
instructions: |
  1. Save the `settings` dictionary to `settings.json` with `json.dump` (use `indent=2`).
  2. Load it back into a new variable `loaded` with `json.load`.
  3. Increase `loaded["launches"]` by 1, add `"sql"` to `loaded["tracks"]`, and save it again.
  4. Print `loaded`.

  ```text
  {'name': 'Asha', 'launches': 4, 'tracks': ['python', 'sql'], 'dark_mode': True}
  ```
starter: |
  import json
  settings = {"name": "Asha", "launches": 3, "tracks": ["python"], "dark_mode": True}
hints:
  - "`with open(\"settings.json\", \"w\", encoding=\"utf-8\") as f: json.dump(settings, f, indent=2)`"
  - "`with open(\"settings.json\", encoding=\"utf-8\") as f: loaded = json.load(f)`"
solution: |
  import json
  settings = {"name": "Asha", "launches": 3, "tracks": ["python"], "dark_mode": True}
  with open("settings.json", "w", encoding="utf-8") as f:
      json.dump(settings, f, indent=2)

  with open("settings.json", encoding="utf-8") as f:
      loaded = json.load(f)
  loaded["launches"] += 1
  loaded["tracks"].append("sql")
  with open("settings.json", "w", encoding="utf-8") as f:
      json.dump(loaded, f, indent=2)
  print(loaded)
explanation: |
  `json.dump` turns the dictionary into JSON text in the file; `json.load` turns it back into a dictionary that
  you can change and save again. `True` is stored as `true` in the file and comes back as `True`.
check:
  expected: |
    {'name': 'Asha', 'launches': 4, 'tracks': ['python', 'sql'], 'dark_mode': True}
  tests:
    - name: settings.json contains the updated data
      code: |
        import json
        assert json.load(open("settings.json", encoding="utf-8"))["launches"] == 4
  requires: ["call:dump", "call:load"]
```

```exercise
id: csv-to-json
title: Convert CSV to JSON grouped by category
difficulty: challenge
instructions: |
  The starter creates `expenses.csv` (columns `category,amount`). Read it, total the amounts per category
  (rounded to 2 decimals), save the totals as JSON in `totals.json` (keys sorted alphabetically - use
  `json.dump(..., sort_keys=True)`), and print the JSON text using `json.dumps(totals, sort_keys=True)`:

  ```text
  {"food": 45.3, "fun": 18.0, "travel": 26.4}
  ```
starter: |
  import csv, json
  with open("expenses.csv", "w", newline="", encoding="utf-8") as f:
      f.write("category,amount\nfood,12.80\ntravel,2.40\nfood,32.50\nfun,18.00\ntravel,24.00\n")

  totals = {}
hints:
  - "Group: `totals[row[\"category\"]] = totals.get(row[\"category\"], 0) + float(row[\"amount\"])`"
  - "Round each total afterwards: `for key in totals: totals[key] = round(totals[key], 2)`"
  - "`json.dump(totals, f, sort_keys=True)` and `print(json.dumps(totals, sort_keys=True))`"
solution: |
  import csv, json
  with open("expenses.csv", "w", newline="", encoding="utf-8") as f:
      f.write("category,amount\nfood,12.80\ntravel,2.40\nfood,32.50\nfun,18.00\ntravel,24.00\n")

  totals = {}
  with open("expenses.csv", newline="", encoding="utf-8") as f:
      for row in csv.DictReader(f):
          category = row["category"]
          totals[category] = totals.get(category, 0) + float(row["amount"])
  for category in totals:
      totals[category] = round(totals[category], 2)
  with open("totals.json", "w", encoding="utf-8") as f:
      json.dump(totals, f, sort_keys=True)
  print(json.dumps(totals, sort_keys=True))
explanation: |
  This is a tiny "ETL" (extract, transform, load) job: extract rows from CSV, transform them (group and total),
  load the result into another format (JSON). Rounding after adding avoids floating-point noise like 45.300000001.
check:
  expected: |
    {"food": 45.3, "fun": 18.0, "travel": 26.4}
  tests:
    - name: totals.json was written
      code: |
        import json
        assert json.load(open("totals.json", encoding="utf-8")) == {"food": 45.3, "fun": 18.0, "travel": 26.4}
```

```quiz
- id: q1
  question: What type are the values you get from `csv.DictReader`?
  options:
    - Always strings
    - Numbers when they look like numbers
    - Whatever Excel used
    - Booleans
  answer: Always strings
  explanation: Convert with int() or float() before doing maths.
- id: q2
  question: Which function turns a JSON **string** into Python data?
  options:
    - json.loads
    - json.load
    - json.dumps
    - json.read
  answer: json.loads
  explanation: loads = load from string. load reads from a file object.
- id: q3
  question: What does JSON's `null` become in Python?
  type: text
  answer: ["None"]
  explanation: null ↔ None, true ↔ True, false ↔ False.
- id: q4
  question: Why use the csv module instead of `line.split(",")`?
  options:
    - It correctly handles commas inside quoted values like "Smith, John"
    - split does not work on strings
    - It is the only way to open files
    - split removes the header
  answer: It correctly handles commas inside quoted values like "Smith, John"
  explanation: Real CSV files can contain commas, quotes and line breaks inside values.
- id: q5
  question: Which file format is best for nested data like a user with a list of addresses?
  options:
    - JSON
    - CSV
    - A plain list of numbers
    - None of them
  answer: JSON
  explanation: CSV is flat (rows and columns); JSON can nest lists and objects.
- id: q6
  question: Why add `newline=""` when opening a CSV file for writing?
  options:
    - To avoid extra blank lines between rows on Windows
    - To make the file smaller
    - It is required for reading only
    - To add a header
  answer: To avoid extra blank lines between rows on Windows
  explanation: The csv module handles line endings itself; newline="" stops Python adding extra ones.
```
