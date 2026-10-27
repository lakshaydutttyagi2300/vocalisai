---
id: py-1-8-error-messages
title: Understanding error messages
track: python
level: 1
order: 8
minutes: 30
summary: A practical guide to the error types you have met so far - SyntaxError, IndentationError, NameError, TypeError, ValueError and ZeroDivisionError - and a reliable routine for fixing them.
objectives:
  - Read a traceback and find the error type, message and line
  - Recognise SyntaxError, IndentationError, NameError, TypeError, ValueError and ZeroDivisionError
  - Name the most likely cause of each error type
  - Use print() to inspect values while debugging
prerequisites: [py-0-3-how-errors-happen, py-1-6-input-and-conversion]
tags: [error message, traceback, exception, SyntaxError, IndentationError, NameError, TypeError, ValueError, ZeroDivisionError, debugging]
---

## Simple explanation

You have now met most of the errors beginners see. This lesson is a field guide: when you see an error name,
you will know where to look.

| Error | Plain meaning | Usual cause |
|---|---|---|
| `SyntaxError` | "I can't read this" | missing bracket, quote or colon; typo in the structure |
| `IndentationError` | "the spaces at the start of a line are wrong" | a line indented that should not be (or the opposite) |
| `NameError` | "I don't know that name" | typo, wrong capitals, missing quotes, used before created |
| `TypeError` | "wrong type of value for this" | mixing text and numbers, e.g. `"Age: " + 30` |
| `ValueError` | "right type, but unusable value" | `int("hello")`, `int("3.5")` |
| `ZeroDivisionError` | "can't divide by zero" | a divisor that is 0 |

Every error message has the same shape: **where** (file and line) and then **what** (type and message) on the
last line.

## Real-world analogy

Error messages are like the **warning lights in a car**. Each light has a meaning: the oil light means
something different from the battery light. Once you know the lights, you go straight to the right part of the
engine instead of panicking. `NameError` → check spelling; `TypeError` → check types.

## Technical definition

- When Python hits a problem it raises an **exception** object of a particular class (`NameError`, ...). If
  nothing handles it, Python prints a **traceback** and stops.
- Traceback format:

  ```text
  Traceback (most recent call last):
    File "your_code.py", line 3, in <module>
      total = price + tax
              ^^^^^^^^^^^
  TypeError: unsupported operand type(s) for +: 'int' and 'str'
  ```

  - `File ..., line 3` - where it happened. `<module>` means "in the main part of the program" (not inside a
    function).
  - The code line and the `^` markers - the exact expression that failed.
  - The last line: `ExceptionType: message`.
- **Syntax errors** have no "Traceback (most recent call last)" header, because the program never started.
- Recent Python versions add helpful suggestions: `NameError: name 'pirnt' is not defined. Did you mean: 'print'?`

## Step-by-step examples

**Example 1 - IndentationError**

```python
print("Start")
    print("Oops")
```

```text
    print("Oops")
IndentationError: unexpected indent
```

Lines that are not inside a block (you will learn blocks in Level 2) must start at the left edge.

**Example 2 - NameError with a suggestion**

```python
message = "hi"
print(mesage)
```

```text
NameError: name 'mesage' is not defined. Did you mean: 'message'?
```

**Example 3 - TypeError from input**

```python
age = input("Age: ")      # user types 30
print(age + 1)
```

```text
TypeError: can only concatenate str (not "int") to str
```

`age` is text. Fix: `age = int(input("Age: "))`.

**Example 4 - debugging with print()**

When a result is wrong but there is no error (a logic error), print the values in the middle of the program:

```python
price = 100
discount = 15
final = price - discount / 100
print("DEBUG final =", final)
```

Output: `DEBUG final = 99.85`. Seeing the value shows the problem: we subtracted 0.15 instead of 15%. The fix is
`final = price - price * discount / 100` (85.0). Remove the debug print afterwards.

**A reliable fixing routine**

1. Read the **last line**: type + message.
2. Jump to the **line number**; read that line *and* the one above.
3. Ask the question that matches the type (table above).
4. Not obvious? **Print the values** involved just before the failing line, and their `type()`.
5. Change **one thing**, run again.

## Common mistakes

- **Reading only the first line** of the traceback. The important part is at the bottom.
- **Fixing the wrong line**: for SyntaxError, the cause is often on the previous line (e.g. a missing `)`).
- **Ignoring "Did you mean"** suggestions - they are usually right.
- **Changing code randomly** until the error goes away - you may hide the bug instead of fixing it.

## Practical application

Professional developers search error messages online all the time - copying the last line of a traceback into a
search engine (or this app's Knowledge Base) is a perfectly normal technique. The *Common Python errors*
article in the Knowledge Base expands this table with more examples.

## Revision notes

- Read tracebacks from the **bottom**: `Type: message`, then line number, then the `^` markers.
- **SyntaxError** brackets/quotes/colons; **IndentationError** spaces at line start; **NameError** spelling,
  capitals, missing quotes, order; **TypeError** mixing types; **ValueError** bad value for a conversion;
  **ZeroDivisionError** dividing by 0.
- Logic errors have no message - print intermediate values to find them.
- Routine: read → locate → match type to cause → inspect with print → change one thing.

```exercise
id: fix-indent
title: Fix an IndentationError
difficulty: beginner
instructions: |
  Run the program to see the IndentationError, then fix it so it prints:

  ```text
  Ready
  Steady
  Go!
  ```
starter: |
  print("Ready")
    print("Steady")
  print("Go!")
hints:
  - The second line starts with spaces. Lines that are not inside a block must start at the left edge.
solution: |
  print("Ready")
  print("Steady")
  print("Go!")
explanation: |
  Python uses indentation to group lines into blocks. An unexpected indent means "this line looks like it
  belongs to a block that does not exist".
check:
  expected: |
    Ready
    Steady
    Go!
```

```exercise
id: fix-value-error
title: Fix a ValueError
difficulty: beginner
instructions: |
  This program asks for a price that can have decimals (like `4.99`) but crashes with a ValueError. Fix the
  conversion so that, for the input `4.99`, it prints:

  ```text
  Price: 4.99
  Two of them cost 9.98
  ```
starter: |
  price = int(input("Price: "))
  print("Two of them cost", price * 2)
hints:
  - "`int()` cannot read `\"4.99\"` - it only accepts whole numbers."
  - Which conversion function accepts decimal numbers?
solution: |
  price = float(input("Price: "))
  print("Two of them cost", price * 2)
explanation: |
  `float()` converts text with a decimal point into a number. `int("4.99")` raises ValueError because the text
  is not a whole number.
stdin: "4.99"
check:
  cases:
    - stdin: "4.99"
      expected: |
        Price: 4.99
        Two of them cost 9.98
    - stdin: "10"
      expected: |
        Price: 10
        Two of them cost 20.0
```

```exercise
id: discount-debug
title: Debug a wrong discount
difficulty: intermediate
instructions: |
  A coat costs 200 and has a 25% discount, so the final price should be **150.0**. The program runs without an
  error but prints the wrong answer. Add a debug print if it helps, find the logic error, and fix the
  calculation so the **last line** printed is:

  ```text
  Final price: 150.0
  ```

  (Remove any debug prints before checking, so the output is just that one line.)
starter: |
  price = 200
  discount_percent = 25
  final = price - discount_percent / 100
  print("Final price:", final)
hints:
  - Print `discount_percent / 100` - it is 0.25, a fraction, not an amount of money.
  - The amount to subtract is `price * discount_percent / 100`.
solution: |
  price = 200
  discount_percent = 25
  final = price - price * discount_percent / 100
  print("Final price:", final)
explanation: |
  25% *of the price* is `price * 25 / 100` = 50. The original code subtracted only 0.25. No error message
  appeared - this was a logic error, found by checking the output.
check:
  expected: |
    Final price: 150.0
  forbid_text: ["150"]
  variants:
    - replace: ["price = 200", "price = 80"]
      expected: |
        Final price: 60.0
```

```exercise
id: four-errors
title: Name that error
difficulty: challenge
instructions: |
  Each commented-out line below would cause an error. **Do not run them.** Instead, set each variable to the
  **name of the error** that line would produce, as a string - e.g. `error_1 = "NameError"`.
  The program then prints your answers.
starter: |
  # error_1:  print(10 / 0)
  # error_2:  int("twelve")
  # error_3:  print("Total: " + 5)
  # error_4:  print(totl)      (only total exists)
  error_1 = ""
  error_2 = ""
  error_3 = ""
  error_4 = ""
  print(error_1, error_2, error_3, error_4)
hints:
  - "Dividing by zero has its own error type."
  - "Text that cannot become a number → ValueError. Mixing str and int with + → TypeError. A misspelled name → NameError."
solution: |
  # error_1:  print(10 / 0)
  # error_2:  int("twelve")
  # error_3:  print("Total: " + 5)
  # error_4:  print(totl)      (only total exists)
  error_1 = "ZeroDivisionError"
  error_2 = "ValueError"
  error_3 = "TypeError"
  error_4 = "NameError"
  print(error_1, error_2, error_3, error_4)
explanation: |
  Dividing by zero → ZeroDivisionError. `int("twelve")` → ValueError (a str, but not a number). Joining str and
  int → TypeError. An unknown name → NameError.
check:
  expected: |
    ZeroDivisionError ValueError TypeError NameError
```

```quiz
- id: q1
  question: Which error do you get from `print(Hello)` when no variable called Hello exists?
  options:
    - NameError
    - TypeError
    - SyntaxError
    - ValueError
  answer: NameError
  explanation: Without quotes, Hello is treated as a name - and that name is not defined.
- id: q2
  question: Where in a traceback is the error type shown?
  options:
    - On the last line
    - On the first line
    - It is never shown
    - In the middle
  answer: On the last line
  explanation: 'The last line has the form `ErrorType: message`.'
- id: q3
  question: Which error does `int("3.5")` raise?
  type: text
  answer: ["ValueError"]
  explanation: The text is not a whole number, so int() cannot convert it. Use float() instead.
- id: q4
  question: A line that is indented when it should not be produces which error?
  type: text
  answer: ["IndentationError"]
  explanation: Unexpected spaces at the start of a line cause an IndentationError.
- id: q5
  question: What is the best first step when a program gives a wrong result but no error?
  options:
    - Print the values in the middle of the program to see where they go wrong
    - Delete the program and start again
    - Change random numbers until it works
    - Ignore it
  answer: Print the values in the middle of the program to see where they go wrong
  explanation: Logic errors are found by inspecting values - print() is the simplest inspection tool.
- id: q6
  question: 'Which error does `"Score: " + 10` raise?'
  type: text
  answer: ["TypeError"]
  explanation: You cannot join a str and an int with +. Convert with str() or use commas in print.
```
