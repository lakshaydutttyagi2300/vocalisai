---
id: python-common-errors
title: Common Python errors and how to fix them
category: Reference
order: 2
tags: [errors, exceptions, traceback, debugging, NameError, TypeError, SyntaxError]
---

Read the **last line** of an error message first: it names the error type and gives the message. Then go to
the line number it mentions (and the line just above it).

## SyntaxError: '(' was never closed
A bracket was opened and not closed. Count your `(` and `)`.

```python
print("Total:", (2 + 3)      # missing )
```

## SyntaxError: unterminated string literal
Text was started with a quote but not finished: `print("Hello)`. Add the closing quote.

## SyntaxError: expected ':'
Lines starting with `if`, `elif`, `else`, `for`, `while`, `def`, `class`, `try`, `except`, `with` must end with a
colon: `if age > 18:`.

## SyntaxError: invalid syntax (with = and ==)
Often `if x = 5:` - inside a condition you need `==`. A single `=` stores a value.

## SyntaxError: invalid character '“' (U+201C)
Curly "smart" quotes copied from a document or web page. Retype them as straight quotes `"`.

## IndentationError: expected an indented block
After a line ending in `:` the next line must be indented (4 spaces):

```python
for i in range(3):
print(i)          # needs 4 spaces in front
```

## IndentationError: unexpected indent
A line is indented although it is not inside a block. Remove the spaces at the start.

## IndentationError: unindent does not match any outer indentation level
Lines in the same block use different numbers of spaces (or a mix of tabs and spaces). Use exactly 4 spaces per
level everywhere.

## NameError: name 'x' is not defined
Python does not know the name. Check: spelling and capital letters; that the variable is created *before* it is
used; quotes around text (`print(hello)` should be `print("hello")`); variables created inside a function are
not visible outside it.

## TypeError: can only concatenate str (not "int") to str
You used `+` between text and a number: `"Age: " + 30`. Use `print("Age:", 30)`, `"Age: " + str(30)` or an
f-string `f"Age: {30}"`.

## TypeError: unsupported operand type(s) for +: 'int' and 'str'
Same problem in the other order - usually a value from `input()` that was not converted: use `int(input(...))`.

## TypeError: 'str' object is not callable / 'int' object is not callable
You used a name as a function after storing a value in it, e.g. `print = "hi"` then `print("x")`, or
`input = 5`. Rename your variable and restart.

## TypeError: f() takes 1 positional argument but 2 were given
You called a function with the wrong number of arguments. Compare the call with the `def` line.

## ValueError: invalid literal for int() with base 10: 'abc'
`int()` received text that is not a whole number. Check the input; for decimals use `float()`; to handle bad
input gracefully use `try` / `except ValueError` (Python Level 7).

## ValueError: too many values to unpack / not enough values to unpack
`a, b = [1, 2, 3]` - the number of names on the left must match the number of values on the right.

## ZeroDivisionError: division by zero
A divisor was 0. Check before dividing: `if count != 0:`.

## IndexError: list index out of range
You asked for a position that does not exist. Lists start at 0; the last index is `len(lst) - 1`. Use
`lst[-1]` for the last item.

## KeyError: 'name'
A dictionary has no such key. Check spelling, print `my_dict.keys()`, or use `my_dict.get("name")`.

## AttributeError: 'str' object has no attribute 'append'
That type of value does not have that method. Check the type with `type(x)` and the spelling of the method.
`'NoneType' object has no attribute ...` usually means a function returned `None` (forgot `return`?).

## ModuleNotFoundError: No module named 'x'
The module is misspelled or not installed. Install packages with `pip` inside the app's virtual environment
(Python Level 10).

## FileNotFoundError: [Errno 2] No such file or directory
The file is not where Python is looking. Relative paths are looked up in the current folder (in this app: your
practice folder). Check the name and extension.

## PermissionError
The operating system (or this app's safety rules) refused the action. In the practice lab, files can only be
changed inside your practice folder. On Windows, the file may be open in another program.

## RecursionError: maximum recursion depth exceeded
A function keeps calling itself without stopping. Check the base case.

## EOFError: EOF when reading a line
Your program called `input()` but there was no input. In this app, type answers in the *Input for your
program* box - one line per `input()`.

## The program never finishes (time limit)
A loop does not stop: a `while` condition that never becomes False, or a counter that is never updated. Add a
`print()` inside the loop to watch it.

## No error, but the answer is wrong
A logic error. Print the values step by step, compare with what you expect, and test small, simple inputs
first.
