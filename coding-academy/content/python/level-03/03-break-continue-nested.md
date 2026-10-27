---
id: py-3-3-break-continue-nested
title: break, continue, nested loops and common loop errors
track: python
level: 3
order: 3
minutes: 40
summary: Control loops precisely - leave early with break, skip a round with continue, put loops inside loops, and recognise the most common loop bugs.
objectives:
  - Leave a loop early with break
  - Skip the rest of one iteration with continue
  - Use the while True + break pattern for menus and validation
  - Write nested loops and predict how many times the inner block runs
  - Recognise off-by-one errors, infinite loops and misplaced code
prerequisites: [py-3-2-while-loops]
tags: [break, continue, nested loop, while True, menu, off-by-one, loop errors]
---

## Simple explanation

Two keywords give you finer control inside any loop:

- **`break`** - *stop the loop now* and continue after it.
- **`continue`** - *skip the rest of this round* and go straight to the next one.

```python
for n in range(1, 10):
    if n == 5:
        break          # leave the loop completely
    print(n)
# prints 1 2 3 4
```

```python
for n in range(1, 6):
    if n == 3:
        continue       # skip just this round
    print(n)
# prints 1 2 4 5
```

A loop can also contain **another loop** - a **nested loop**. The inner loop runs completely for *each* round
of the outer loop.

## Real-world analogy

- `break` is like **finding your keys**: you were checking every pocket, but once you find them you stop
  searching.
- `continue` is like **skipping a song you dislike** in a playlist: you do not stop the music, you just move
  to the next song.
- Nested loops are like a **clock**: for every hour (outer loop), the minute hand goes all the way round
  (inner loop).

## Technical definition

- `break` terminates the **innermost** loop containing it. Execution continues with the first statement after
  that loop.
- `continue` ends the current iteration of the innermost loop; a `for` moves to the next item, a `while`
  re-checks its condition.
- **`while True:` + `break`**: an intentionally endless loop whose exit is decided inside - convenient when the
  check naturally happens *in the middle* of the loop (after asking for input).
- **Nested loops**: if the outer loop runs *m* times and the inner loop *n* times, the inner block runs
  *m × n* times. `break` in the inner loop only leaves the inner loop.
- (Python also has an optional `else:` on loops that runs when the loop was **not** ended by `break`. It is
  handy but rarely needed by beginners.)

## Step-by-step examples

**Example 1 - search and stop**

```python
word = "programming"
for letter in word:
    if letter == "g":
        print("Found a g!")
        break
print("Search over")
```

Output: `Found a g!` then `Search over` - the loop stopped at the first `g` instead of checking every letter.

**Example 2 - a menu with while True** (Input: `1`, `2`, `q`)

```python
while True:
    choice = input("1=hello 2=bye q=quit: ")
    if choice == "q":
        break
    if choice == "1":
        print("Hello!")
    elif choice == "2":
        print("Goodbye!")
    else:
        print("Unknown option")
print("Menu closed")
```

Output:

```text
1=hello 2=bye q=quit: 1
Hello!
1=hello 2=bye q=quit: 2
Goodbye!
1=hello 2=bye q=quit: q
Menu closed
```

**Example 3 - skipping with continue**

```python
for n in range(1, 11):
    if n % 3 == 0:
        continue
    print(n, end=" ")
```

Output: `1 2 4 5 7 8 10 ` - multiples of 3 are skipped.

**Example 4 - nested loops: a small grid**

```python
for row in range(1, 4):
    for col in range(1, 4):
        print(row * col, end="\t")
    print()
```

Output (a 3×3 multiplication grid; `\t` is a tab):

```text
1	2	3
2	4	6
3	6	9
```

The inner loop runs 3 times for each of the 3 outer rounds - 9 times in total. The `print()` after the inner
loop (indented once) ends each row.

**Common loop errors at a glance**

| Bug | Example | Fix |
|---|---|---|
| Off-by-one | `range(1, 10)` to print 1-10 | `range(1, 11)` |
| Infinite loop | `while x < 5:` but x never changes | update x inside the loop |
| Reset inside loop | `total = 0` inside the loop | move it before the loop |
| Print inside instead of after | final `print(total)` indented | un-indent it |
| Changing the loop counter of a for | `for i in range(5): i += 2` | has no effect on the next round - use while |

## Common mistakes

- **Expecting `break` to leave all loops** - it only leaves the innermost one.
- **`continue` in a while loop before the update**: `while n < 5: if ...: continue; n += 1` can skip the update
  forever → infinite loop. Update first, or use a for loop.
- **`while True` without any `break`** → infinite loop.
- **Wrong indentation in nested loops**: code meant for the outer loop accidentally indented into the inner one.

## Practical application

`break` powers searches ("stop at the first unpaid invoice") and menus. `continue` filters ("skip blank lines,
skip cancelled orders"). Nested loops handle grids and tables: seating plans, game boards, comparing every item
with every other item, or rows × columns in a report.

## Revision notes

- `break`: leave the innermost loop immediately.
- `continue`: skip to the next iteration.
- `while True:` + `break` - for menus and "ask until valid" loops.
- Nested loops: inner runs fully for each outer round (m × n times).
- Watch for: off-by-one, missing updates, resetting accumulators inside the loop, wrong indentation.

```exercise
id: first-negative
title: Stop at the first negative number
difficulty: beginner
instructions: |
  Keep asking `Number: ` and print each number back as `You typed <n>`. As soon as the user types a
  **negative** number, stop (without printing it) and print `Stopped`.

  ```text
  Number: 4
  You typed 4
  Number: 9
  You typed 9
  Number: -1
  Stopped
  ```
starter: |
  while True:
      n = int(input("Number: "))
hints:
  - "Right after reading n: `if n < 0:` then `break`."
  - The `print(\"Stopped\")` goes after the loop, not indented.
solution: |
  while True:
      n = int(input("Number: "))
      if n < 0:
          break
      print("You typed", n)
  print("Stopped")
explanation: |
  `while True` loops until `break` is reached. Checking *before* printing means the negative number itself is not
  printed.
stdin: |
  4
  9
  -1
check:
  cases:
    - stdin: "4\n9\n-1\n"
      expected: |
        Number: 4
        You typed 4
        Number: 9
        You typed 9
        Number: -1
        Stopped
    - stdin: "-5\n"
      expected: |
        Number: -5
        Stopped
  requires: [break]
```

```exercise
id: skip-odd
title: Skip with continue
difficulty: beginner
instructions: |
  Print the numbers from 1 to 10 **except** multiples of 4, all on one line separated by spaces, using
  `continue`. The output must be exactly:

  ```text
  1 2 3 5 6 7 9 10
  ```

  Tip: print the numbers with `end=" "` and finish with an empty `print()`. (Trailing spaces at the end of a line
  are ignored by the checker.)
starter: |
  for n in range(1, 11):
      print(n, end=" ")
  print()
hints:
  - "Inside the loop, before printing: `if n % 4 == 0:` then `continue`."
solution: |
  for n in range(1, 11):
      if n % 4 == 0:
          continue
      print(n, end=" ")
  print()
explanation: |
  `continue` jumps back to the top of the loop for the next number, so the print is skipped for 4 and 8.
check:
  expected: |
    1 2 3 5 6 7 9 10
  requires: [continue]
```

```exercise
id: rectangle
title: Draw a rectangle with nested loops
difficulty: intermediate
instructions: |
  Using **nested loops** (one loop inside another), draw a rectangle of `#` characters that is `width` wide and
  `height` tall. With `width = 5` and `height = 3`:

  ```text
  #####
  #####
  #####
  ```

  Do not use `"#" * width` - the point is to practise nested loops.
starter: |
  width = 5
  height = 3
hints:
  - "Outer loop for the rows: `for row in range(height):`"
  - "Inner loop prints one `#` per column with `print(\"#\", end=\"\")`, then a `print()` after the inner loop ends the row."
solution: |
  width = 5
  height = 3
  for row in range(height):
      for col in range(width):
          print("#", end="")
      print()
explanation: |
  The inner loop prints `width` hashes on one line (`end=""` keeps them together). The `print()` at the outer
  level moves to the next line. It runs `height` times.
check:
  expected: |
    #####
    #####
    #####
  forbid_text: ['"#" *', "'#' *", '"#"*']
  variants:
    - replace: ["width = 5", "width = 2"]
      expected: |
        ##
        ##
        ##
    - replace: ["height = 3", "height = 1"]
      expected: |
        #####
  requires: [nested-loop]
```

```exercise
id: prime-check
title: Is it prime?
difficulty: challenge
instructions: |
  A prime number is a whole number greater than 1 that can only be divided exactly by 1 and itself (2, 3, 5, 7,
  11...). Ask `Number: ` and print `<n> is prime` or `<n> is not prime`.

  Use a loop that tries possible divisors and **breaks** as soon as it finds one.

  ```text
  Number: 13
  13 is prime
  ```
starter: |
  n = int(input("Number: "))
  is_prime = True
hints:
  - Numbers below 2 are never prime - handle that first.
  - "Try every divisor from 2 up to n - 1: `for d in range(2, n):` and `if n % d == 0:` → it is not prime: set `is_prime = False` and `break`."
  - Print the message after the loop, depending on `is_prime`.
solution: |
  n = int(input("Number: "))
  is_prime = True
  if n < 2:
      is_prime = False
  for d in range(2, n):
      if n % d == 0:
          is_prime = False
          break
  if is_prime:
      print(n, "is prime")
  else:
      print(n, "is not prime")
explanation: |
  The loop looks for any divisor. Finding one proves the number is not prime, so there is no need to keep
  looking - `break`. (Checking only up to the square root of n would be faster, but this version is easier to
  understand.)
stdin: "13"
check:
  cases:
    - {stdin: "13", expected: "Number: 13\n13 is prime\n"}
    - {stdin: "2", expected: "Number: 2\n2 is prime\n"}
    - {stdin: "1", expected: "Number: 1\n1 is not prime\n"}
    - {stdin: "21", expected: "Number: 21\n21 is not prime\n"}
    - {stdin: "97", expected: "Number: 97\n97 is prime\n"}
  requires: [break]
```

```quiz
- id: q1
  question: What does this print?
  code: |
    for n in range(10):
        if n == 3:
            break
        print(n)
  options:
    - 0, 1, 2 (each on its own line)
    - 0, 1, 2, 3
    - 3
    - 0 to 9
  answer: 0, 1, 2 (each on its own line)
  explanation: When n is 3, break ends the loop before printing.
- id: q2
  question: What does `continue` do?
  options:
    - Skips the rest of the current iteration and moves to the next one
    - Ends the loop
    - Ends the program
    - Repeats the current iteration
  answer: Skips the rest of the current iteration and moves to the next one
  explanation: The loop carries on with the next item.
- id: q3
  question: How many times does the inner print run?
  code: |
    for a in range(4):
        for b in range(3):
            print(a, b)
  type: text
  answer: ["12", "twelve"]
  explanation: 4 outer rounds × 3 inner rounds = 12.
- id: q4
  question: A `break` inside the inner loop of two nested loops ...
  options:
    - leaves only the inner loop
    - leaves both loops
    - ends the program
    - is not allowed
  answer: leaves only the inner loop
  explanation: break affects the innermost loop that contains it.
- id: q5
  question: You want to print 1 to 10 and wrote `for n in range(1, 10):`. What kind of bug is this?
  options:
    - An off-by-one error
    - An infinite loop
    - A syntax error
    - A type error
  answer: An off-by-one error
  explanation: The stop value is excluded, so 10 is missing. Use range(1, 11).
- id: q6
  question: Which pattern is best for a menu that repeats until the user types q?
  options:
    - "while True: ... if choice == 'q': break"
    - "for i in range(10): ..."
    - A single if statement
    - Copying the menu code 100 times
  answer: "while True: ... if choice == 'q': break"
  explanation: The loop runs until the user decides to stop - break leaves it.
```
