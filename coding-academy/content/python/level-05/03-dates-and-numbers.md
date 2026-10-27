---
id: py-5-3-dates-and-numbers
title: Working with numbers and dates
track: python
level: 5
order: 3
minutes: 40
summary: Round and format numbers correctly, avoid floating-point surprises, use the math module, and handle dates and times with datetime - parsing, formatting and date arithmetic.
objectives:
  - Round numbers and understand floating-point precision
  - Use the math module for common functions
  - Create dates with datetime.date and get today's date
  - Format dates with strftime and read them with strptime
  - Calculate with dates using timedelta (days between dates, adding days)
prerequisites: [py-5-2-fstrings-split-join]
tags: [round, float, precision, math, datetime, date, strftime, strptime, timedelta, decimal]
---

## Simple explanation

**Numbers.** `round(x, 2)` rounds to two decimal places. Computers store decimals in binary, so some results
are slightly off: `0.1 + 0.2` is `0.30000000000000004`. That is normal - round or format for display. For money
where every cent must be exact, Python offers the `decimal` module.

The **`math`** module adds functions such as `math.sqrt` (square root), `math.ceil` (round up) and `math.floor`
(round down). You load a module with `import math` (modules are explained properly in Level 8).

**Dates.** Python's `datetime` module understands calendars:

```python
from datetime import date, timedelta
today = date.today()
birthday = date(2026, 12, 25)
print((birthday - today).days, "days to go")
print(today + timedelta(days=30))          # the date 30 days from now
print(birthday.strftime("%d/%m/%Y"))       # 25/12/2026
```

## Real-world analogy

Dates are not ordinary numbers - you cannot just add 1 to "31 January" and get "32 January". `datetime` is like
a **smart calendar** that knows month lengths, leap years and weekdays, so "31 January + 1 day" correctly gives
"1 February".

## Technical definition

- `round(x, n)` uses "banker's rounding" for exact halves: `round(2.5)` is `2`, `round(3.5)` is `4`.
- Floats are binary approximations (IEEE 754). Compare floats with tolerance: `math.isclose(a, b)`.
- `decimal.Decimal("0.10")` stores exact decimal values (create from strings, not floats).
- `math`: `sqrt`, `ceil`, `floor`, `pi`, `pow`, `isclose`, `log`...
- `datetime` module types: `date` (year, month, day), `time`, `datetime` (date + time), `timedelta` (a
  duration).
- `date.today()`, `datetime.now()`; attributes `.year .month .day`; `.weekday()` (Monday = 0).
- **Formatting** `d.strftime(format)`: `%Y` year, `%m` month (01-12), `%d` day, `%B` month name, `%A` weekday
  name, `%H:%M` hours:minutes. `d.isoformat()` → `"2026-10-27"`.
- **Parsing** `datetime.strptime(text, format)` → datetime; `.date()` keeps only the date.
  `date.fromisoformat("2026-10-27")` parses ISO dates directly.
- Subtracting two dates gives a `timedelta`; `.days` is the number of days. Adding a `timedelta` to a date gives
  a new date.

## Step-by-step examples

**Example 1 - rounding and precision**

```python
print(0.1 + 0.2)                 # 0.30000000000000004
print(round(0.1 + 0.2, 2))       # 0.3
print(f"{2 / 3:.3f}")            # 0.667
import math
print(math.ceil(4.1), math.floor(4.9))   # 5 4
print(math.sqrt(81))             # 9.0
```

**Example 2 - how many boxes?** (always round *up*)

```python
import math
items = 53
per_box = 12
print("Boxes needed:", math.ceil(items / per_box))    # 5
```

**Example 3 - dates and differences**

```python
from datetime import date
start = date(2026, 1, 15)
end = date(2026, 3, 1)
gap = end - start
print(gap.days)            # 45
print(start.strftime("%A %d %B %Y"))   # Thursday 15 January 2026
```

**Example 4 - adding days**

```python
from datetime import date, timedelta
ordered = date(2026, 10, 27)
delivery = ordered + timedelta(days=5)
print("Delivery:", delivery.isoformat())   # 2026-11-01
```

Python knew October has 31 days.

**Example 5 - reading a date typed by the user** (Input: `25/12/2026`)

```python
from datetime import datetime
text = input("Date (dd/mm/yyyy): ")
when = datetime.strptime(text, "%d/%m/%Y").date()
print("Weekday:", when.strftime("%A"))
```

Output: `Weekday: Friday`.

## Common mistakes

- **Comparing floats with `==`**: `0.1 + 0.2 == 0.3` is `False`. Use `round` or `math.isclose`.
- **`round` for money totals**: rounding each line separately can give a different total than rounding once.
  For accounting, use `decimal.Decimal`.
- **Wrong format codes**: `%m` is month, `%M` is *minutes*; `%y` is a 2-digit year, `%Y` is 4 digits.
- **Mixing day/month order**: `03/04/2026` is 3 April in most of the world but March 4 in the USA. Prefer ISO
  `YYYY-MM-DD`.
- **Adding numbers to dates**: `date + 1` is a TypeError; use `timedelta(days=1)`.

## Practical application

Invoices (rounding, totals), loan and savings calculators, delivery dates, age calculations, monthly reports,
"days until renewal" reminders - and reading the dates stored in CSV files and databases. The expense tracker
project groups spending by month using exactly these tools.

## Revision notes

- Floats are approximate; `round(x, 2)` or `f"{x:.2f}"` for display; `math.isclose` to compare.
- `import math`: `ceil` (up), `floor` (down), `sqrt`, `pi`.
- `from datetime import date, datetime, timedelta`.
- `date(2026, 12, 25)`, `date.today()`, `d.year/.month/.day`, `d.weekday()`.
- Format `d.strftime("%d/%m/%Y")`; parse `datetime.strptime(text, "%d/%m/%Y").date()`; ISO `date.fromisoformat`.
- `end - start` → timedelta (`.days`); `d + timedelta(days=7)`.

```exercise
id: round-results
title: Rounding results
difficulty: beginner
instructions: |
  A bill of `total` is shared by `people`. Print each person's share rounded to 2 decimal places using `round()`,
  and the number of 6-seat taxis needed for the group using `math.ceil`.

  ```text
  Share: 27.86
  Taxis: 2
  ```
starter: |
  import math
  total = 195
  people = 7
hints:
  - "`round(total / people, 2)`"
  - "`math.ceil(people / 6)` rounds up - you cannot book 1.17 taxis."
solution: |
  import math
  total = 195
  people = 7
  print("Share:", round(total / people, 2))
  print("Taxis:", math.ceil(people / 6))
explanation: |
  195 / 7 = 27.857..., rounded to 27.86. 7 people need 7 / 6 = 1.17 taxis, which `ceil` rounds up to 2.
check:
  expected: |
    Share: 27.86
    Taxis: 2
  requires: ["call:round", "call:ceil"]
  variants:
    - replace: ["people = 7", "people = 12"]
      expected: |
        Share: 16.25
        Taxis: 2
```

```exercise
id: days-until
title: Days until a date
difficulty: beginner
instructions: |
  Using `date` objects, print how many days there are from `start` to `end`, and the weekday name of `end`.

  ```text
  Days: 59
  Weekday: Friday
  ```
starter: |
  from datetime import date
  start = date(2026, 10, 27)
  end = date(2026, 12, 25)
hints:
  - "`(end - start).days` gives the number of days."
  - "`end.strftime(\"%A\")` gives the weekday name."
solution: |
  from datetime import date
  start = date(2026, 10, 27)
  end = date(2026, 12, 25)
  print("Days:", (end - start).days)
  print("Weekday:", end.strftime("%A"))
explanation: |
  Subtracting dates gives a timedelta whose `.days` is the gap. `%A` formats the full weekday name.
check:
  expected: |
    Days: 59
    Weekday: Friday
  forbid_text: ["59", "Friday"]
```

```exercise
id: due-date
title: Library due date
difficulty: intermediate
instructions: |
  Ask `Borrowed on (YYYY-MM-DD): `. Books are due back 21 days later. Print the due date in the format
  `Monday 16 November 2026`.

  ```text
  Borrowed on (YYYY-MM-DD): 2026-10-26
  Due: Monday 16 November 2026
  ```
starter: |
  from datetime import date, timedelta
  text = input("Borrowed on (YYYY-MM-DD): ")
hints:
  - "`borrowed = date.fromisoformat(text)`"
  - "`due = borrowed + timedelta(days=21)`"
  - "`due.strftime(\"%A %d %B %Y\")`"
solution: |
  from datetime import date, timedelta
  text = input("Borrowed on (YYYY-MM-DD): ")
  borrowed = date.fromisoformat(text)
  due = borrowed + timedelta(days=21)
  print("Due:", due.strftime("%A %d %B %Y"))
explanation: |
  `fromisoformat` turns the text into a date; adding a timedelta handles month ends automatically; `strftime`
  formats the result.
stdin: "2026-10-26"
check:
  cases:
    - {stdin: "2026-10-26", expected: "Borrowed on (YYYY-MM-DD): 2026-10-26\nDue: Monday 16 November 2026\n"}
    - {stdin: "2026-12-20", expected: "Borrowed on (YYYY-MM-DD): 2026-12-20\nDue: Sunday 10 January 2027\n"}
  requires: ["call:timedelta"]
```

```exercise
id: age-calculator
title: Exact age calculator
difficulty: challenge
instructions: |
  Ask `Birth date (dd/mm/yyyy): ` and print the person's age in whole years **on the reference date**
  `on_date` (use this fixed date instead of today, so the answer can be checked). Someone has not had their
  birthday yet this year if their (month, day) is later than the reference date's (month, day).

  ```text
  Birth date (dd/mm/yyyy): 15/11/1990
  Age: 35
  ```
starter: |
  from datetime import date, datetime
  on_date = date(2026, 10, 27)
  text = input("Birth date (dd/mm/yyyy): ")
hints:
  - "`born = datetime.strptime(text, \"%d/%m/%Y\").date()`"
  - "Start with `age = on_date.year - born.year`."
  - "Tuples compare item by item: `if (on_date.month, on_date.day) < (born.month, born.day): age -= 1`"
solution: |
  from datetime import date, datetime
  on_date = date(2026, 10, 27)
  text = input("Birth date (dd/mm/yyyy): ")
  born = datetime.strptime(text, "%d/%m/%Y").date()
  age = on_date.year - born.year
  if (on_date.month, on_date.day) < (born.month, born.day):
      age -= 1
  print("Age:", age)
explanation: |
  The difference in years is correct only once the birthday has passed in the reference year. Comparing
  (month, day) tuples answers "has the birthday happened yet?" in one comparison. (Dividing days by 365 would be
  wrong around birthdays because of leap years.)
stdin: "15/11/1990"
check:
  cases:
    - {stdin: "15/11/1990", expected: "Birth date (dd/mm/yyyy): 15/11/1990\nAge: 35\n"}
    - {stdin: "27/10/2000", expected: "Birth date (dd/mm/yyyy): 27/10/2000\nAge: 26\n"}
    - {stdin: "01/01/2010", expected: "Birth date (dd/mm/yyyy): 01/01/2010\nAge: 16\n"}
  requires: ["call:strptime"]
```

```quiz
- id: q1
  question: What does `print(0.1 + 0.2 == 0.3)` show?
  type: text
  answer: ["False"]
  explanation: Floating-point numbers are approximations; 0.1 + 0.2 is 0.30000000000000004.
- id: q2
  question: Which function rounds 4.1 **up** to 5?
  options:
    - math.ceil
    - math.floor
    - round
    - int
  answer: math.ceil
  explanation: ceil = ceiling (round up); floor rounds down; round(4.1) gives 4.
- id: q3
  question: 'What does `date(2026, 3, 1) - date(2026, 2, 1)` give (as `.days`)?'
  type: text
  answer: ["28"]
  explanation: February 2026 has 28 days (2026 is not a leap year).
- id: q4
  question: Which format code gives the full month name, like "November"?
  options:
    - "%B"
    - "%m"
    - "%M"
    - "%b"
  answer: "%B"
  explanation: "%m is the month number, %M is minutes, %b is the short name (Nov)."
- id: q5
  question: How do you get the date 7 days after `d`?
  options:
    - d + timedelta(days=7)
    - d + 7
    - d.add(7)
    - date(d + 7)
  answer: d + timedelta(days=7)
  explanation: Dates are combined with timedelta durations, not plain numbers.
- id: q6
  question: Which date format is unambiguous everywhere in the world?
  options:
    - 2026-03-04 (YYYY-MM-DD)
    - 03/04/2026
    - 04/03/26
    - 4.3.26
  answer: 2026-03-04 (YYYY-MM-DD)
  explanation: The ISO format is standard and also sorts correctly as text.
```
