---
id: py-5-2-fstrings-split-join
title: f-strings, formatting, split and join
track: python
level: 5
order: 2
minutes: 40
summary: Build neat text with f-strings and format codes (decimals, padding, thousands separators), and turn text into lists and back with split and join.
objectives:
  - Insert values into text with f-strings
  - Format numbers - decimal places, thousands separators, percentages, padding and alignment
  - Split text into a list with split()
  - Join a list of strings into text with join()
  - Clean and parse simple user input such as "3, 5, 8"
prerequisites: [py-5-1-string-methods]
tags: [f-string, format, formatting, decimal places, padding, split, join, parsing, cleaning input]
---

## Simple explanation

**f-strings** are the easiest way to build text from values. Put an `f` before the opening quote and write any
expression inside curly braces `{ }`:

```python
name = "Asha"
total = 1234.5
print(f"{name} spent {total} this month")
print(f"Next year {name} will be {30 + 1}")
```

Add a **format code** after a colon inside the braces:

```python
print(f"{total:.2f}")      # 1234.50   - 2 decimal places
print(f"{total:,.2f}")     # 1,234.50  - with thousands separator
print(f"{0.256:.1%}")      # 25.6%     - as a percentage
print(f"[{name:>8}]")      # [    Asha] - right-aligned in 8 characters
```

**split** cuts text into a list; **join** glues a list of strings into text:

```python
"red, green, blue".split(", ")      # ['red', 'green', 'blue']
" - ".join(["a", "b", "c"])          # 'a - b - c'
```

## Real-world analogy

An f-string is a **form letter with blanks**: "Dear {name}, your balance is {balance}." Python fills in the
blanks. Format codes are the instructions in small print: "write the amount with two decimals and commas".

`split` is like **cutting a string of sausages** at each knot; `join` is **tying them back together** with
whatever knot (separator) you choose.

## Technical definition

- **f-string** (formatted string literal): `f"...{expression}..."`. Expressions are evaluated at run time.
  Literal braces are written `{{` and `}}`. `f"{x=}"` prints `x=<value>` - handy for debugging.
- **Format specification** after `:` - common forms:
  - `.2f` fixed-point with 2 decimals; `,` thousands separator; `.1%` percentage (multiplies by 100);
  - width and alignment: `>10` right, `<10` left, `^10` centre; fill character: `*^10`; zero padding: `05d`;
  - `d` integer, `e` scientific.
- `round(x, n)` returns a rounded number; formatting only changes how it is **displayed**.
- `s.split(sep=None, maxsplit=-1)` - with no argument splits on any whitespace and drops empty pieces; with a
  separator splits exactly at it.
- `sep.join(iterable_of_strings)` - all items must be strings (`TypeError` otherwise; convert with `str`).
- Older styles you may see: `"%s is %d" % (name, age)` and `"{} is {}".format(name, age)`.

## Step-by-step examples

**Example 1 - a receipt line**

```python
item = "Coffee"
qty = 3
price = 2.5
print(f"{qty} x {item:<10} {qty * price:>8.2f}")
```

Output: `3 x Coffee         7.50`

**Example 2 - a small table**

```python
rows = [("Rent", 1100), ("Food", 385.5), ("Travel", 92.25)]
for label, amount in rows:
    print(f"{label:<8}{amount:>10,.2f}")
```

Output:

```text
Rent      1,100.00
Food        385.50
Travel       92.25
```

**Example 3 - splitting input into numbers** (Input: `4, 8, 15`)

```python
text = input("Numbers separated by commas: ")
parts = text.split(",")
numbers = []
for part in parts:
    numbers.append(int(part.strip()))
print(numbers, "sum =", sum(numbers))
```

Output: `[4, 8, 15] sum = 27`. `strip()` removes the spaces after each comma.

**Example 4 - split on whitespace**

```python
sentence = "  The   quick brown   fox "
words = sentence.split()
print(words)            # ['The', 'quick', 'brown', 'fox']
print(len(words))       # 4
```

**Example 5 - join**

```python
fruits = ["apple", "pear", "plum"]
print(", ".join(fruits))          # apple, pear, plum
print("\n".join(fruits))          # one per line
numbers = [1, 2, 3]
print("+".join(str(n) for n in numbers), "=", sum(numbers))   # 1+2+3 = 6
```

(`str(n) for n in numbers` converts each number - a *generator expression*, explained in Level 8.)

## Common mistakes

- **Forgetting the `f`**: `"Total: {total}"` prints the braces literally.
- **Formatting a string as a number**: `f"{'5':.2f}"` → ValueError. Convert with `float()` first.
- **Confusing rounding and formatting**: `f"{x:.2f}"` displays two decimals but does not change `x`.
- **`split(",")` leaves spaces**: `"a, b".split(",")` → `['a', ' b']`; strip each part.
- **Joining numbers**: `", ".join([1, 2])` → TypeError; convert to strings first.
- **`join` written backwards**: it is `separator.join(list)`, not `list.join(separator)`.

## Practical application

Receipts, reports and invoices need neatly aligned numbers with two decimals. Splitting is how you read simple
data formats (CSV lines, "key=value" settings, command words). Joining builds output such as tag lists, CSV lines
and file paths. These skills feed directly into the CSV analyser and expense tracker projects.

## Revision notes

- `f"Hello {name}, total {total:.2f}"` - expressions in braces, format after `:`.
- `.2f` decimals, `,` thousands, `.1%` percent, `>10`/`<10`/`^10` align, `05d` zero-pad.
- `s.split()` on whitespace; `s.split(",")` at commas (then `strip` each part).
- `", ".join(list_of_strings)` - convert numbers with `str` first.
- Formatting changes the display; `round` changes the number.

```exercise
id: fstring-intro
title: Introduce yourself with an f-string
difficulty: beginner
instructions: |
  Using **one f-string** and the variables provided, print:

  ```text
  Priya is 28 and lives in Pune.
  ```
starter: |
  name = "Priya"
  age = 28
  city = "Pune"
hints:
  - "Start the string with `f` and put each variable in braces: `f\"{name} is ...\"`"
solution: |
  name = "Priya"
  age = 28
  city = "Pune"
  print(f"{name} is {age} and lives in {city}.")
explanation: |
  Inside an f-string, `{name}` is replaced by the variable's value. Numbers are converted to text automatically.
check:
  expected: |
    Priya is 28 and lives in Pune.
  requires: [f-string]
  variants:
    - replace: ['name = "Priya"', 'name = "Omar"']
      expected: |
        Omar is 28 and lives in Pune.
```

```exercise
id: money-format
title: Format money
difficulty: beginner
instructions: |
  Print the total of the `amounts` list with **two decimal places** and a **thousands separator**, using an
  f-string format code:

  ```text
  Total: 12,345.60
  ```
starter: |
  amounts = [10000, 2000.5, 345.1]
hints:
  - "`total = sum(amounts)`"
  - "The format code for thousands separator and two decimals is `:,.2f`."
solution: |
  amounts = [10000, 2000.5, 345.1]
  total = sum(amounts)
  print(f"Total: {total:,.2f}")
explanation: |
  `,` adds thousands separators and `.2f` shows exactly two decimals - rounding the display, not the stored
  number.
check:
  expected: |
    Total: 12,345.60
  require_text: [",.2f"]
```

```exercise
id: parse-numbers
title: Parse a list of numbers
difficulty: intermediate
instructions: |
  Ask `Numbers: ` - the user types whole numbers separated by commas, maybe with spaces. Print how many numbers
  there are, their total, and the average with one decimal place:

  ```text
  Numbers: 4, 8,15 , 16
  Count: 4
  Total: 43
  Average: 10.8
  ```
starter: |
  text = input("Numbers: ")
hints:
  - "`text.split(\",\")` gives pieces like `' 8'` - strip each one before converting with `int()`."
  - "`f\"Average: {total / count:.1f}\"`"
solution: |
  text = input("Numbers: ")
  numbers = []
  for part in text.split(","):
      numbers.append(int(part.strip()))
  total = sum(numbers)
  count = len(numbers)
  print(f"Count: {count}")
  print(f"Total: {total}")
  print(f"Average: {total / count:.1f}")
explanation: |
  Splitting at commas then stripping each piece copes with any spacing. The `.1f` format shows one decimal place
  (43 / 4 = 10.75 is displayed as 10.8).
stdin: "4, 8,15 , 16"
check:
  cases:
    - {stdin: "4, 8,15 , 16", expected: "Numbers: 4, 8,15 , 16\nCount: 4\nTotal: 43\nAverage: 10.8\n"}
    - {stdin: "10,20", expected: "Numbers: 10,20\nCount: 2\nTotal: 30\nAverage: 15.0\n"}
  requires: ["method:split"]
```

```exercise
id: receipt
title: Print an aligned receipt
difficulty: challenge
instructions: |
  Print a receipt for the `basket` (item, quantity, unit price). Each line: the item **left-aligned in 10
  characters**, the quantity **right-aligned in 3**, and the line total **right-aligned in 8 with 2 decimals**.
  Then a line of 21 dashes and the total aligned the same way:

  ```text
  Bread       2    3.00
  Milk        1    1.20
  Cheese      1    4.75
  ---------------------
  Total            8.95
  ```

  (The last line is `"Total"` left-aligned in 13 characters, then the total right-aligned in 8.)
starter: |
  basket = [("Bread", 2, 1.5), ("Milk", 1, 1.2), ("Cheese", 1, 4.75)]
hints:
  - "`f\"{item:<10}{qty:>3}{line_total:>8.2f}\"` formats one line."
  - "`\"-\" * 21` makes the dashed line."
  - "`f\"{'Total':<13}{total:>8.2f}\"` for the last line."
solution: |
  basket = [("Bread", 2, 1.5), ("Milk", 1, 1.2), ("Cheese", 1, 4.75)]
  total = 0
  for item, qty, price in basket:
      line_total = qty * price
      total += line_total
      print(f"{item:<10}{qty:>3}{line_total:>8.2f}")
  print("-" * 21)
  print(f"{'Total':<13}{total:>8.2f}")
explanation: |
  Width and alignment codes keep columns lined up no matter how long each value is. 10 + 3 + 8 = 21 characters
  per line, which is why the dashed line is 21 long.
check:
  expected: |
    Bread       2    3.00
    Milk        1    1.20
    Cheese      1    4.75
    ---------------------
    Total            8.95
  requires: [f-string, for]
```

```quiz
- id: q1
  question: 'What does `f"{7 / 2:.1f}"` produce?'
  type: text
  answer: ["3.5", "'3.5'"]
  explanation: 7 / 2 is 3.5, shown with one decimal place.
- id: q2
  question: 'What does `"a,b,,c".split(",")` give?'
  options:
    - "['a', 'b', '', 'c']"
    - "['a', 'b', 'c']"
    - "['a,b,,c']"
    - "['a', 'b', ',', 'c']"
  answer: "['a', 'b', '', 'c']"
  explanation: Splitting at each comma leaves an empty string between the two adjacent commas.
- id: q3
  question: 'What does `"-".join(["2026", "10", "27"])` give?'
  type: text
  answer: ["2026-10-27", "'2026-10-27'"]
  explanation: join puts the separator between the items.
- id: q4
  question: Which format code shows 1234567.891 as `1,234,567.89`?
  options:
    - ":,.2f"
    - ":.2"
    - ":,"
    - ":2f,"
  answer: ":,.2f"
  explanation: The comma adds thousands separators; .2f shows two decimals.
- id: q5
  question: 'What does `print("Total: {x}")` print when x = 5?'
  options:
    - "Total: {x}"
    - "Total: 5"
    - An error
    - "Total: x"
  answer: "Total: {x}"
  explanation: Without the f prefix the braces are printed literally.
- id: q6
  question: 'What is `"  many   spaces  here ".split()`?'
  options:
    - "['many', 'spaces', 'here']"
    - "['', 'many', '', '', 'spaces', '', 'here', '']"
    - "['  many   spaces  here ']"
    - "['many spaces here']"
  answer: "['many', 'spaces', 'here']"
  explanation: split() with no argument splits on runs of whitespace and ignores leading/trailing spaces.
```
