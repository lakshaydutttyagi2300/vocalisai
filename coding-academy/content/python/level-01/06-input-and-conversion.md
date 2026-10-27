---
id: py-1-6-input-and-conversion
title: Input from users and type conversion
track: python
level: 1
order: 6
minutes: 35
summary: Make programs interactive with input(), and convert between text and numbers with int(), float() and str().
objectives:
  - Ask the user a question with input() and store the answer
  - Explain why input() always returns a string
  - Convert values with int(), float() and str()
  - Recognise and fix the ValueError caused by invalid conversions
  - Use the "Input for your program" box in this app
prerequisites: [py-1-4-data-types, py-1-5-arithmetic]
tags: [input, type conversion, casting, int, float, str, ValueError, interactive]
---

## Simple explanation

`input()` lets a program **ask a question** and **wait** for the user to type an answer:

```python
name = input("What is your name? ")
print("Hello,", name)
```

The text inside the brackets is the **prompt** shown to the user. Whatever the user types (before pressing
Enter) is returned and stored in the variable.

**One very important rule:** `input()` **always gives you a string** - even if the user types `25`. To do maths
with it you must **convert** it:

```python
age = int(input("How old are you? "))
print("Next year you will be", age + 1)
```

Conversion functions:

| Function | Converts to | Example | Result |
|---|---|---|---|
| `int(...)` | whole number | `int("25")` | `25` |
| `float(...)` | decimal number | `float("2.5")` | `2.5` |
| `str(...)` | text | `str(25)` | `"25"` |

**Typing input in this app:** when your code contains `input(`, a box called **Input for your program**
appears under the editor. Type the answers there - **one answer per line**, one line for each `input()` call -
then press Run. The app shows the prompt and your answer in the output, just like a real terminal.

## Real-world analogy

`input()` is like a **form at a reception desk**: the receptionist (your program) hands you a question, waits,
and takes back your written answer. Even if you write a number on the form, it is still *ink on paper* (text).
Before anyone can do sums with it, they have to **read it as a number** - that is conversion.

## Technical definition

- `input(prompt="")` prints the prompt (without a new line), reads one line from **standard input**, removes the
  trailing new-line character and returns the text as a `str`.
- **Type conversion** (also called **casting**): creating a value of one type from a value of another.
  - `int(x)` accepts strings of digits (optional sign and surrounding spaces): `int(" 42 ")` → `42`. It does
    **not** accept decimals in strings: `int("3.5")` raises `ValueError`. Given a float, `int(3.9)` drops the
    fraction → `3`.
  - `float(x)` accepts `"3.5"`, `"3"`, `"-0.25"`, `"1e3"`.
  - `str(x)` turns any value into its text form.
- **ValueError**: raised when a function receives the right type but an unusable value, e.g. `int("hello")`.
- **Nesting**: `int(input("..."))` - the inner call runs first, its result is passed to the outer call.

## Step-by-step examples

**Example 1 - a greeting** (Input box: `Asha`)

```python
name = input("What is your name? ")
print("Nice to meet you,", name)
```

Output in this app:

```text
What is your name? Asha
Nice to meet you, Asha
```

**Example 2 - the classic bug: adding strings** (Input box: `5` and `3` on two lines)

```python
a = input("First number: ")
b = input("Second number: ")
print(a + b)
```

Output:

```text
First number: 5
Second number: 3
53
```

Both values are strings, so `+` joined them. The fix is to convert:

```python
a = int(input("First number: "))
b = int(input("Second number: "))
print(a + b)       # 8
```

**Example 3 - decimals with float()** (Input box: `72.5`)

```python
weight = float(input("Weight in kg: "))
print("In pounds:", weight * 2.2)
```

Output: `Weight in kg: 72.5` then `In pounds: 159.5`.

**Example 4 - str() for joining**

```python
score = 42
message = "Your score is " + str(score)
print(message)
```

Output: `Your score is 42`.

**Example 5 - a ValueError** (Input box: `ten`)

```python
age = int(input("Age: "))
```

Output:

```text
Age: ten
ValueError: invalid literal for int() with base 10: 'ten'
```

`int()` can only convert text that looks like a whole number. In Level 7 you will learn to handle this
gracefully with `try`/`except`.

## Common mistakes

- **Forgetting to convert** before maths → string joining (`"5" + "3"` = `"53"`) or `TypeError`.
- **Using `int()` for decimal input** like `"3.5"` → ValueError. Use `float()`.
- **Empty Input box in this app** → `EOFError: EOF when reading a line`. Type an answer for every `input()`.
- **Forgetting the space at the end of the prompt**: `input("Name?")` makes the answer stick to the question:
  `Name?Asha`. Write `input("Name? ")`.
- **Too many brackets or too few**: `int(input("Age: ")` is missing a `)`. Count them: each `(` needs a `)`.

## Practical application

Interactive programs - calculators, quizzes, games, unit converters, simple menus - all use `input()`. The
pattern *ask → convert → calculate → print* is the backbone of the calculator and number-guessing projects.
Later you will get input from files, websites and databases instead - and the same conversion rules apply.

## Revision notes

- `x = input("Question? ")` shows the prompt and returns what the user typed - **always a `str`**.
- Convert before maths: `int(...)` for whole numbers, `float(...)` for decimals; `str(...)` to turn values into
  text.
- `int(input("..."))` - inner call first, then convert.
- Invalid conversions (`int("ten")`, `int("3.5")`) raise **ValueError**.
- In this app: type answers in **Input for your program**, one line per `input()`.

```exercise
id: greet-user
title: Greet the user
difficulty: beginner
instructions: |
  Ask the user for their name with the prompt `What is your name? ` (note the space at the end), then print
  `Hello, <name>!`

  Example - with the input `Maria` the output must be:

  ```text
  What is your name? Maria
  Hello, Maria!
  ```

  Type `Maria` in the **Input for your program** box to test it.
starter: |
  name = input("What is your name? ")
hints:
  - "The variable `name` already holds what the user typed."
  - "To get `Hello, Maria!` with no space before the `!`, join strings: `print(\"Hello, \" + name + \"!\")`"
solution: |
  name = input("What is your name? ")
  print("Hello, " + name + "!")
explanation: |
  `input` returns the typed text. Joining with `+` gives exact control over spaces - a comma in print would put
  a space before the `!`.
stdin: "Maria"
check:
  cases:
    - stdin: "Maria"
      expected: |
        What is your name? Maria
        Hello, Maria!
    - stdin: "Kofi"
      expected: |
        What is your name? Kofi
        Hello, Kofi!
```

```exercise
id: add-two
title: Add two numbers
difficulty: beginner
instructions: |
  Ask for two whole numbers and print their sum. With inputs `5` and `3` the output must be:

  ```text
  First number: 5
  Second number: 3
  Sum: 8
  ```

  The starter code has the classic bug - it prints `53`. Fix it.
starter: |
  a = input("First number: ")
  b = input("Second number: ")
  print("Sum:", a + b)
hints:
  - "`input()` gives strings, and `+` joins strings. Convert each answer with `int(...)`."
  - "`a = int(input(\"First number: \"))`"
solution: |
  a = int(input("First number: "))
  b = int(input("Second number: "))
  print("Sum:", a + b)
explanation: |
  Converting each answer with `int()` turns the text "5" into the number 5, so `+` adds instead of joining.
stdin: |
  5
  3
check:
  cases:
    - stdin: "5\n3\n"
      expected: |
        First number: 5
        Second number: 3
        Sum: 8
    - stdin: "10\n-4\n"
      expected: |
        First number: 10
        Second number: -4
        Sum: 6
```

```exercise
id: celsius
title: Temperature converter
difficulty: intermediate
instructions: |
  Ask for a temperature in Celsius with the prompt `Celsius: ` and print it in Fahrenheit using
  `fahrenheit = celsius * 9 / 5 + 32`. The input may be a decimal, so use `float`.

  With the input `25` the output must be:

  ```text
  Celsius: 25
  Fahrenheit: 77.0
  ```
starter: |
  # ask, convert, calculate, print

hints:
  - "`celsius = float(input(\"Celsius: \"))`"
  - "Then calculate `fahrenheit` with the formula and print `\"Fahrenheit:\", fahrenheit`."
solution: |
  celsius = float(input("Celsius: "))
  fahrenheit = celsius * 9 / 5 + 32
  print("Fahrenheit:", fahrenheit)
explanation: |
  `float()` accepts both `25` and `36.6`. Multiplication and division happen before the `+ 32`, which is exactly
  what the formula needs.
stdin: "25"
check:
  cases:
    - stdin: "25"
      expected: |
        Celsius: 25
        Fahrenheit: 77.0
    - stdin: "36.6"
      expected: |
        Celsius: 36.6
        Fahrenheit: 97.88000000000001
    - stdin: "-40"
      expected: |
        Celsius: -40
        Fahrenheit: -40.0
```

```exercise
id: age-in-days
title: Age in days (with str)
difficulty: challenge
instructions: |
  Ask `How old are you? `, then print a single message built by **joining strings with `+`** (not commas)
  saying roughly how many days old the person is (age × 365). With the input `30`:

  ```text
  How old are you? 30
  You are about 10950 days old.
  ```
starter: |
  age = int(input("How old are you? "))
hints:
  - "Calculate first: `days = age * 365`."
  - "To join a number into text with `+`, convert it: `str(days)`."
solution: |
  age = int(input("How old are you? "))
  days = age * 365
  print("You are about " + str(days) + " days old.")
explanation: |
  `str(days)` turns the number into text so it can be joined with the other strings. Without it, Python would
  raise a TypeError.
stdin: "30"
check:
  cases:
    - stdin: "30"
      expected: |
        How old are you? 30
        You are about 10950 days old.
    - stdin: "1"
      expected: |
        How old are you? 1
        You are about 365 days old.
  requires: ["call:str"]
```

```quiz
- id: q1
  question: What type does `input()` always return?
  options:
    - str
    - int
    - float
    - It depends on what the user types
  answer: str
  explanation: Everything typed by the user arrives as text. Convert it if you need a number.
- id: q2
  question: The user types 4 and 6 for these two inputs. What is printed?
  code: |
    a = input()
    b = input()
    print(a + b)
  type: text
  answer: ["46"]
  explanation: Both are strings, so + joins them into "46".
- id: q3
  question: Which conversion turns the text `"7.5"` into a number you can calculate with?
  options:
    - float("7.5")
    - int("7.5")
    - str("7.5")
    - input("7.5")
  answer: float("7.5")
  explanation: "`int(\"7.5\")` raises a ValueError because the text is not a whole number."
- id: q4
  question: What does `int("hello")` raise?
  type: text
  answer: ["ValueError"]
  explanation: The type (str) is acceptable, but the value cannot be read as a number.
- id: q5
  question: 'What does `print("Total: " + str(5 * 2))` show?'
  type: text
  answer: ["Total: 10"]
  explanation: 5 × 2 = 10, converted to "10" and joined to the text.
- id: q6
  question: In this app, a program has two `input()` calls. What should the Input box contain?
  options:
    - Two lines - one answer for each input() call, in order
    - Nothing - the app guesses
    - The prompts themselves
    - One line containing both answers separated by a comma
  answer: Two lines - one answer for each input() call, in order
  explanation: Each input() reads the next line of the Input box.
```
