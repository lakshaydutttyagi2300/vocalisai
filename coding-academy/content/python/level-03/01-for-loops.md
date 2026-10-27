---
id: py-3-1-for-loops
title: Repeating with for loops and range()
track: python
level: 3
order: 1
minutes: 40
summary: Why loops are useful, how a for loop repeats a block, counting with range(), looping over the letters of a string, and building up totals.
objectives:
  - Explain why loops are useful
  - Write a for loop that repeats a block a fixed number of times
  - Use range() with one, two and three arguments
  - Loop over the characters of a string
  - Use an accumulator variable to build a total inside a loop
prerequisites: [py-2-2-if-elif-else]
tags: [loop, for, range, iteration, accumulator, repeat]
---

## Simple explanation

Suppose you want to print "Happy birthday!" five times. You *could* write five `print` lines - but what about
500 times? Or once for each name in a list of 10,000 customers? **Loops** repeat code for you.

A **for loop** runs its block **once for each item** in a sequence:

```python
for number in range(5):
    print("Happy birthday!", number)
```

`range(5)` produces the numbers `0, 1, 2, 3, 4` (five numbers, **starting at 0**, stopping *before* 5). Each time
round the loop, the variable `number` holds the next value. One trip through the block is called an
**iteration**.

You can also loop over the **letters of a string**:

```python
for letter in "Hi!":
    print(letter)
```

## Real-world analogy

A for loop is like a **teacher calling the register**: "for each student in the class: read the name, wait for
'present', tick the box". The same steps are repeated for every student, and the teacher knows exactly when to
stop - after the last name.

## Technical definition

- Syntax:

  ```text
  for variable in iterable:
      block
  ```

- An **iterable** is anything that can produce items one at a time: `range(...)`, strings, lists (Level 4),
  files (Level 7)...
- The **loop variable** is assigned each item in turn. It still exists after the loop, holding the last item.
- **`range`**:
  - `range(stop)` → 0, 1, ..., stop-1
  - `range(start, stop)` → start, start+1, ..., stop-1
  - `range(start, stop, step)` → counts in steps; a negative step counts down: `range(10, 0, -2)` → 10, 8, 6, 4, 2
  - The **stop value is never included**.
- **Accumulator pattern**: a variable created *before* the loop and updated *inside* it (`total += ...`),
  used *after* the loop.

## Step-by-step examples

**Example 1 - counting from 1 to 5**

```python
for i in range(1, 6):
    print(i)
```

Output: `1 2 3 4 5` on separate lines. `range(1, 6)` stops *before* 6.

**Example 2 - a times table**

```python
for i in range(1, 4):
    print(7, "x", i, "=", 7 * i)
```

Output:

```text
7 x 1 = 7
7 x 2 = 14
7 x 3 = 21
```

**Example 3 - the accumulator pattern: adding 1 to 100**

```python
total = 0
for n in range(1, 101):
    total += n
print("Sum:", total)
```

Output: `Sum: 5050`. Step by step: `total` starts at 0; on each iteration the current `n` is added. The final
`print` is **not indented**, so it runs once, after the loop finishes.

**Example 4 - counting down and stepping**

```python
for n in range(10, 0, -3):
    print(n)
print("Lift off!")
```

Output: `10`, `7`, `4`, `1`, `Lift off!`

**Example 5 - looping over a string with a condition**

```python
word = "banana"
count = 0
for letter in word:
    if letter == "a":
        count += 1
print("a appears", count, "times")
```

Output: `a appears 3 times`. Notice the `if` block is indented **twice**: once for the loop, once for the `if`.

## Common mistakes

- **Off-by-one**: `range(1, 10)` gives 1-9, not 1-10. Use `range(1, 11)` for 1-10.
- **Indenting the final print** so it runs every iteration instead of once at the end.
- **Resetting the accumulator inside the loop** (`total = 0` inside the loop) - it must be set *before* the loop.
- **Forgetting the colon** at the end of the `for` line.
- **Using `range("5")`** - range needs integers. Convert input with `int()` first.

## Practical application

Loops process collections of data: every order in a report, every line of a file, every pixel in an image,
every row from a database. The accumulator pattern (totals, counts, maximums) appears in the expense tracker,
CSV analyser and almost every data task you will ever do.

## Revision notes

- `for item in iterable:` + indented block - repeats once per item.
- `range(stop)`, `range(start, stop)`, `range(start, stop, step)` - stop is **excluded**; counting starts at 0 by
  default.
- Strings are iterable: `for ch in "text":` visits each character.
- **Accumulator**: create before the loop, update inside, use after.
- The indentation decides what is inside the loop.

```exercise
id: count-to-ten
title: Count to 10
difficulty: beginner
instructions: |
  Use a `for` loop with `range` to print the numbers 1 to 10, one per line.
starter: |
  for number in range(10):
      print(number)
hints:
  - The starter prints 0 to 9. `range(start, stop)` lets you choose the start.
  - The stop value is not included, so to reach 10 you need `range(1, 11)`.
solution: |
  for number in range(1, 11):
      print(number)
explanation: |
  `range(1, 11)` starts at 1 and stops *before* 11, giving exactly 1-10.
check:
  expected: |
    1
    2
    3
    4
    5
    6
    7
    8
    9
    10
  requires: [for, "call:range"]
```

```exercise
id: times-table
title: Times table
difficulty: beginner
instructions: |
  Ask `Which table? ` and print that multiplication table from 1 to 5. For `3`:

  ```text
  Which table? 3
  3 x 1 = 3
  3 x 2 = 6
  3 x 3 = 9
  3 x 4 = 12
  3 x 5 = 15
  ```
starter: |
  table = int(input("Which table? "))
hints:
  - "`for i in range(1, 6):`"
  - "Inside: `print(table, \"x\", i, \"=\", table * i)`"
solution: |
  table = int(input("Which table? "))
  for i in range(1, 6):
      print(table, "x", i, "=", table * i)
explanation: |
  The loop variable `i` takes the values 1 to 5; each iteration prints one line of the table.
stdin: "3"
check:
  cases:
    - stdin: "3"
      expected: |
        Which table? 3
        3 x 1 = 3
        3 x 2 = 6
        3 x 3 = 9
        3 x 4 = 12
        3 x 5 = 15
    - stdin: "7"
      expected: |
        Which table? 7
        7 x 1 = 7
        7 x 2 = 14
        7 x 3 = 21
        7 x 4 = 28
        7 x 5 = 35
  requires: [for]
```

```exercise
id: sum-evens
title: Sum of even numbers
difficulty: intermediate
instructions: |
  Use a loop and an accumulator to add up all the **even** numbers from 2 to `limit` (including `limit` if it is
  even), then print the total. With `limit = 10` the answer is 2 + 4 + 6 + 8 + 10:

  ```text
  Total: 30
  ```
starter: |
  limit = 10
  total = 0
hints:
  - "`range(2, limit + 1, 2)` counts 2, 4, 6... up to and including limit."
  - "Inside the loop: `total += n`. Print once, after the loop (not indented)."
solution: |
  limit = 10
  total = 0
  for n in range(2, limit + 1, 2):
      total += n
  print("Total:", total)
explanation: |
  The step of 2 visits only even numbers. `limit + 1` makes sure `limit` itself is included. The print is outside
  the loop, so it runs once with the final total.
check:
  expected: |
    Total: 30
  requires: [for]
  forbid_text: ["30"]
  variants:
    - replace: ["limit = 10", "limit = 100"]
      expected: |
        Total: 2550
    - replace: ["limit = 10", "limit = 7"]
      expected: |
        Total: 12
```

```exercise
id: count-vowels
title: Count the vowels
difficulty: challenge
instructions: |
  Ask `Text: ` and count how many vowels (a, e, i, o, u - lower **or** upper case) it contains. Print
  `Vowels: <count>`.

  ```text
  Text: Hello World
  Vowels: 3
  ```
starter: |
  text = input("Text: ")
  count = 0
hints:
  - "Loop over every character: `for ch in text:`"
  - "Check membership: `if ch in \"aeiouAEIOU\":` then `count += 1`."
solution: |
  text = input("Text: ")
  count = 0
  for ch in text:
      if ch in "aeiouAEIOU":
          count += 1
  print("Vowels:", count)
explanation: |
  The loop visits each character once. `ch in "aeiouAEIOU"` is True for any vowel, in either case, so the counter
  increases only for vowels.
stdin: "Hello World"
check:
  cases:
    - {stdin: "Hello World", expected: "Text: Hello World\nVowels: 3\n"}
    - {stdin: "AEIOU aeiou", expected: "Text: AEIOU aeiou\nVowels: 10\n"}
    - {stdin: "rhythm", expected: "Text: rhythm\nVowels: 0\n"}
  requires: [for]
```

```quiz
- id: q1
  question: Which numbers does `range(4)` produce?
  options:
    - 0, 1, 2, 3
    - 1, 2, 3, 4
    - 0, 1, 2, 3, 4
    - "4"
  answer: 0, 1, 2, 3
  explanation: range starts at 0 by default and stops before the stop value.
- id: q2
  question: Which numbers does `range(2, 10, 3)` produce?
  options:
    - 2, 5, 8
    - 2, 5, 8, 11
    - 3, 6, 9
    - 2, 3, 4, 5, 6, 7, 8, 9
  answer: 2, 5, 8
  explanation: Start at 2, add 3 each time, stop before 10.
- id: q3
  question: How many times does "hi" get printed?
  code: |
    for i in range(1, 4):
        print("hi")
  type: text
  answer: ["3", "three"]
  explanation: range(1, 4) gives 1, 2, 3 - three iterations.
- id: q4
  question: What does this print?
  code: |
    total = 0
    for n in range(1, 4):
        total += n
    print(total)
  type: text
  answer: ["6"]
  explanation: 1 + 2 + 3 = 6. The print is outside the loop, so it runs once.
- id: q5
  question: In the accumulator pattern, where should `total = 0` go?
  options:
    - Before the loop
    - Inside the loop
    - After the loop
    - It is not needed
  answer: Before the loop
  explanation: Inside the loop it would be reset to 0 on every iteration.
- id: q6
  question: How do you print the numbers 1 to 100 inclusive?
  options:
    - "for n in range(1, 101): print(n)"
    - "for n in range(1, 100): print(n)"
    - "for n in range(100): print(n)"
    - "for n in range(0, 100, 1): print(n)"
  answer: "for n in range(1, 101): print(n)"
  explanation: The stop value is excluded, so you need 101 to include 100.
```
