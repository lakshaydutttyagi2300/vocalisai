---
id: py-1-1-print
title: Your first Python program - print() in depth
track: python
level: 1
order: 1
minutes: 30
summary: Everything you need to know about showing output - printing text and numbers, several values at once, quotes inside text, new lines, and the sep and end options.
objectives:
  - Print text, numbers and calculations with print()
  - Print several values in one print() call
  - Use single and double quotes, and put quote marks inside text
  - Create new lines with \n and empty lines with print()
  - Control the separator and the line ending with sep= and end=
prerequisites: [py-0-1-what-is-a-program, py-0-3-how-errors-happen]
tags: [print, output, string, quotes, newline, sep, end, function, argument]
---

## Simple explanation

`print()` shows things on the screen. You met it in Level 0; now let's learn it properly, because you will use
it in almost every program you write.

- **Text** goes inside quote marks: `print("Hello")`.
- **Numbers** do not need quotes: `print(42)`.
- **Calculations** are worked out first, then printed: `print(6 * 7)` shows `42`.
- **Several values**, separated by commas, are printed on one line with a space between them:
  `print("Age:", 30)` shows `Age: 30`.

Each `print()` normally ends by moving to a **new line**, so the next print starts underneath.

## Real-world analogy

`print()` is like a **label printer**. You hand it some items (the values in the brackets); it prints them in a
row with a small gap between each one, then feeds the paper to the next line. The `sep` option changes the gap;
the `end` option changes what happens at the end of the label.

## Technical definition

- `print` is a built-in **function**. A function is a named, ready-made piece of code. You **call** a function
  by writing its name followed by round brackets: `print(...)`.
- The values inside the brackets are the **arguments**. `print("Age:", 30)` has two arguments.
- A piece of text in quotes is called a **string** (type `str`). Strings can use double quotes `"..."` or single
  quotes `'...'` - both mean the same.
- `print(*values, sep=" ", end="\n")`: values are converted to text, joined with `sep` (default: one space), and
  followed by `end` (default: `\n`, the new-line character).
- **Escape sequences** are special two-character codes inside strings: `\n` = new line, `\t` = tab,
  `\"` = a double quote, `\\` = a backslash.

## Step-by-step examples

**Example 1 - text, numbers and calculations**

```python
print("Welcome to Python")
print(2026)
print(10 + 5)
print("10 + 5")
```

Output:

```text
Welcome to Python
2026
15
10 + 5
```

The last two lines show the key difference: without quotes, `10 + 5` is **calculated**; with quotes, it is just
**text** and printed exactly as written.

**Example 2 - several values at once**

```python
print("Total:", 3 * 4, "apples")
```

Output: `Total: 12 apples`. Python printed three values with one space between each. You did not need to type
the spaces yourself.

**Example 3 - quotes inside text**

```python
print("It's sunny")
print('She said "hello"')
print("She said \"hello\"")
```

Output:

```text
It's sunny
She said "hello"
She said "hello"
```

Use double quotes around text containing an apostrophe, single quotes around text containing double quotes,
or **escape** the inner quote with a backslash `\"`.

**Example 4 - new lines and empty lines**

```python
print("Line 1\nLine 2")
print()
print("After an empty line")
```

Output:

```text
Line 1
Line 2

After an empty line
```

`\n` inside a string starts a new line. `print()` with nothing inside prints an empty line.

**Example 5 - sep and end**

```python
print("2026", "10", "27", sep="-")
print("Loading", end="...")
print("done!")
```

Output:

```text
2026-10-27
Loading...done!
```

`sep="-"` puts a dash between the values instead of a space. `end="..."` replaces the usual new line, so the
next print continues on the same line.

## Common mistakes

- **Mismatched quotes:** `print("Hello')` - start and end quotes must be the same kind.
- **Missing comma between values:** `print("Age:" 30)` is a SyntaxError. Write `print("Age:", 30)`.
- **Adding your own spaces as well:** `print("Age: ", 30)` prints *two* spaces (`Age:  30`), because print
  already adds one.
- **Capital P:** `Print(...)` is a NameError - Python is case-sensitive.
- **Curly "smart" quotes** copied from documents (`“Hello”`) are not valid Python quotes.

## Practical application

Programs use `print` to show results, ask questions, display reports and - very importantly - to help
**debug**: printing the value of something at a certain moment is the quickest way to see what your program is
really doing.

## Revision notes

- `print(...)` shows values. Text (strings) needs quotes; numbers and calculations do not.
- Commas separate several values: `print("Sum:", 2 + 3)` → `Sum: 5` (a space is added automatically).
- `"double"` or `'single'` quotes - same meaning. Escape inner quotes with `\"` or `\'`.
- `\n` = new line inside a string; `print()` alone = empty line.
- `sep="..."` changes what goes *between* values; `end="..."` changes what goes at the *end* (default: new line).

```exercise
id: intro-card
title: A small introduction card
difficulty: beginner
instructions: |
  Write a program that prints exactly:

  ```text
  Name: Alex
  Hobby: coding
  ```
starter: |
  # Print two lines
hints:
  - Use two `print(...)` lines, each with text in quote marks.
  - Check spaces and capital letters - they must match exactly.
solution: |
  print("Name: Alex")
  print("Hobby: coding")
explanation: |
  Each `print` writes one line. The text inside the quotes is printed exactly as written.
check:
  expected: |
    Name: Alex
    Hobby: coding
```

```exercise
id: several-values
title: Several values in one print
difficulty: beginner
instructions: |
  Use **one** `print()` call with **three** values separated by commas - the text `"Minutes in a day:"`,
  the calculation `24 * 60`, and the text `"minutes"` - to print:

  ```text
  Minutes in a day: 1440 minutes
  ```
starter: |
  print("Minutes in a day:")
hints:
  - Put commas between the values inside the brackets.
  - Let Python calculate `24 * 60` - do not type 1440.
solution: |
  print("Minutes in a day:", 24 * 60, "minutes")
explanation: |
  `print` evaluates `24 * 60` to `1440`, then prints the three values with a single space between each.
check:
  expected: |
    Minutes in a day: 1440 minutes
  forbid_text: ["1440"]
  require_text: [","]
```

```exercise
id: quotes-inside
title: Quotes inside text
difficulty: intermediate
instructions: |
  Print these two lines exactly (notice the apostrophe and the double quote marks):

  ```text
  It's my first program.
  The teacher said "well done".
  ```
starter: |
  print('It's my first program.')
hints:
  - The apostrophe in `It's` ends a string that started with a single quote. Use double quotes around that text instead.
  - For the second line, use single quotes around text that contains double quotes - or escape them with `\"`.
solution: |
  print("It's my first program.")
  print('The teacher said "well done".')
explanation: |
  Choose the outer quote type that does *not* appear inside the text. Double quotes around `It's`; single quotes
  around text containing `"well done"`. Escaping (`\"`) works too.
check:
  expected: |
    It's my first program.
    The teacher said "well done".
```

```exercise
id: sep-end
title: Dates and loading messages with sep and end
difficulty: challenge
instructions: |
  Change the program so that it prints exactly:

  ```text
  27/10/2026
  Loading...done!
  ```

  Rules:
  - Keep the numbers `27, 10, 2026` as three separate values and use **`sep=`** to put slashes between them.
  - Keep `"Loading"` and `"done!"` in two separate `print()` calls and use **`end=`** so they appear on the same
    line with `...` between them.
starter: |
  print(27, 10, 2026)
  print("Loading")
  print("done!")
hints:
  - "`sep=\"/\"` replaces the space between values with a slash."
  - "`end=\"...\"` replaces the new line at the end of a print with three dots."
solution: |
  print(27, 10, 2026, sep="/")
  print("Loading", end="...")
  print("done!")
explanation: |
  `sep="/"` changes what goes *between* the values. `end="..."` changes what goes at the *end* of the first
  print, so instead of a new line we get `...` and the next print continues on the same line.
check:
  expected: |
    27/10/2026
    Loading...done!
  require_text: ["sep=", "end="]
```

```quiz
- id: q1
  question: What does this print?
  code: |
    print("5 + 5")
  options:
    - "5 + 5"
    - "10"
    - "\"5 + 5\""
    - An error
  answer: "5 + 5"
  explanation: With quote marks it is text, so it is printed exactly as written - not calculated.
- id: q2
  question: What does this print?
  code: |
    print("Score:", 7 * 2)
  type: text
  answer: ["Score: 14"]
  explanation: The calculation becomes 14, and print adds one space between the two values.
- id: q3
  question: Which line correctly prints `It's late`?
  options:
    - "print(\"It's late\")"
    - "print('It's late')"
    - "print(It's late)"
    - "print(\"It's late')"
  answer: "print(\"It's late\")"
  explanation: Double quotes around text that contains an apostrophe. Single quotes would end the string at the apostrophe.
- id: q4
  question: What does `\n` mean inside a string?
  options:
    - Start a new line
    - The letter n
    - Nothing - it is ignored
    - End the program
  answer: Start a new line
  explanation: "`\\n` is an escape sequence for the new-line character."
- id: q5
  question: What is the output?
  code: |
    print("a", "b", "c", sep="-")
  type: text
  answer: ["a-b-c"]
  explanation: sep replaces the space between values with a dash.
- id: q6
  question: What does `end=""` do in `print("Hi", end="")`?
  options:
    - The next print continues on the same line
    - It deletes the text
    - It ends the program
    - It prints the word end
  answer: The next print continues on the same line
  explanation: end replaces the usual new line at the end of the print; an empty string means "nothing".
```
