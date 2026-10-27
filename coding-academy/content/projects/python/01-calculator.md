---
id: proj-py-01-calculator
title: Command-line calculator
track: python
order: 1
difficulty: beginner
summary: A calculator that asks for two numbers and an operation, handles mistakes politely, and keeps going until you quit.
internet: false
skills: [py-1-5-arithmetic, py-1-6-input-and-conversion, py-2-2-if-elif-else, py-3-2-while-loops, py-6-1-defining-functions, py-7-3-exceptions]
demo_input: |
  12
  +
  30
  y
  7
  /
  0
  y
  abc
  9
  **
  2
  n
starter: |
  # Command-line calculator
  # Stage 1: ask for two numbers and an operation, then print the result.

  first = float(input("First number: "))
  operation = input("Operation (+ - * /): ")
  second = float(input("Second number: "))

  # your code here: work out the result and print it
stages:
  - name: Beginner
    description: A calculator that works for one sum.
    tasks:
      - {id: b1, text: "The program asks for two numbers and an operation (+, -, *, /)"}
      - {id: b2, text: "It prints the correct result for each of the four operations"}
      - {id: b3, text: "An unknown operation prints a friendly message instead of crashing"}
  - name: Intermediate
    description: Robust and repeatable.
    tasks:
      - {id: i1, text: "Dividing by zero prints a helpful message instead of crashing"}
      - {id: i2, text: "Typing text instead of a number asks again instead of crashing"}
      - {id: i3, text: "After each calculation it asks 'Another? (y/n)' and repeats until the user says n"}
      - {id: i4, text: "The calculation is done in a function calculate(a, op, b) that returns the result"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Add powers (**), whole-number division (//) and remainder (%)"}
      - {id: e2, text: "Keep a history list and print all calculations when the user quits"}
      - {id: e3, text: "Write assert tests for calculate() covering every operation and division by zero"}
---

## Goal

Build a small calculator you run in the Python Lab (or a terminal). It should feel friendly: no crashes, clear
messages, and it keeps working until you choose to stop.

## Example run

```text
First number: 12
Operation (+ - * / **): +
Second number: 30
12.0 + 30.0 = 42.0
Another? (y/n): y
First number: 7
Operation (+ - * / **): /
Second number: 0
Sorry, you can't divide by zero.
Another? (y/n): n
Goodbye!
```

## Step-by-step plan

1. **Stage 1** - read two numbers with `float(input(...))` and an operation; use `if / elif / else` to choose
   the calculation; print the result.
2. Move the decision into a function `calculate(a, op, b)` that **returns** the result (or raises an error) -
   the function shouldn't print.
3. Handle problems: division by zero, unknown operation, and text that isn't a number (a helper function
   `ask_number(prompt)` with a `while True` loop and `try/except ValueError`).
4. Wrap the whole thing in a loop that ends when the user answers `n`.
5. Test `calculate` with a few `assert`s.

## Hints

- `float("abc")` raises `ValueError` - catch it and ask again.
- For division by zero you can either check `if b == 0` before dividing, or catch `ZeroDivisionError`.
- `answer.strip().lower() == "n"` accepts `N`, ` n ` and `n`.
- In the Python Lab, type all your answers in the **input box** (one per line) before pressing Run - the lab
  feeds them to your program in order.

## Sample solution

```python
def calculate(a, op, b):
    """Return a op b. Raises ZeroDivisionError or ValueError for bad input."""
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    if op == "*":
        return a * b
    if op == "/":
        return a / b                     # may raise ZeroDivisionError
    if op == "**":
        return a ** b
    raise ValueError(f"Unknown operation: {op}")


def ask_number(prompt):
    while True:
        text = input(prompt)
        try:
            return float(text)
        except ValueError:
            print(f"'{text}' is not a number - please try again.")


def main():
    history = []
    while True:
        a = ask_number("First number: ")
        op = input("Operation (+ - * / **): ").strip()
        b = ask_number("Second number: ")
        try:
            result = calculate(a, op, b)
        except ZeroDivisionError:
            print("Sorry, you can't divide by zero.")
        except ValueError as err:
            print(err)
        else:
            line = f"{a} {op} {b} = {result}"
            history.append(line)
            print(line)
        if input("Another? (y/n): ").strip().lower() == "n":
            break
    print("History:", *history, sep="\n  ")
    print("Goodbye!")


assert calculate(2, "+", 3) == 5
assert calculate(2, "**", 3) == 8
main()
```

## Test your program

Try: normal sums for each operation, `0` as the second number with `/`, a word instead of a number, an unknown
operation like `x`, and upper-case `N` to quit. Every case should give a sensible message - never a red error.
