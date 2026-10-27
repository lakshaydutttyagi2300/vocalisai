---
id: py-3-2-while-loops
title: while loops and infinite loops
track: python
level: 3
order: 2
minutes: 35
summary: Repeat "as long as" a condition is True - while loops, loop counters, input validation loops, and how to avoid (and stop) infinite loops.
objectives:
  - Write a while loop that repeats while a condition is True
  - Choose between a for loop and a while loop
  - Make sure a while loop eventually stops
  - Recognise an infinite loop and know how it is stopped
  - Use a while loop to repeat a question until the answer is valid
prerequisites: [py-3-1-for-loops]
tags: [while, loop, infinite loop, condition, counter, validation, sentinel]
---

## Simple explanation

A **while loop** repeats its block **as long as a condition is True**:

```python
count = 1
while count <= 3:
    print("Round", count)
    count += 1
print("Finished")
```

Before each round, Python checks the condition. True → run the block, then check again. False → skip to the
line after the loop.

**for or while?**

- Use **for** when you know *what* to loop over (a range of numbers, the letters of a word, a list).
- Use **while** when you repeat *until something happens* (until the user types "quit", until the balance
  reaches a target, until a guess is right) and do not know in advance how many rounds that takes.

**Danger:** if the condition never becomes False, the loop never ends - an **infinite loop**. In this app, the
practice lab stops any program after the time limit (10 seconds by default), so you cannot freeze your
computer. In a terminal you would press **Ctrl + C**.

## Real-world analogy

A while loop is like **stirring soup until it boils**: check - not boiling yet? stir; check again... As soon as
it boils, you stop. You do not know beforehand how many stirs it needs. If you forget to turn the hob on, the
soup never boils and you stir forever - an infinite loop.

## Technical definition

- Syntax:

  ```text
  while condition:
      block
  ```

- The condition is evaluated **before every iteration**, including the first - a while loop may run zero
  times.
- Something inside the block must eventually make the condition False (change a counter, read new input...).
  Otherwise you get an **infinite loop**.
- `while True:` deliberately creates a loop that only ends through `break` (next lesson) - a common pattern for
  menus and input validation.
- A **sentinel value** is a special input that means "stop", like `quit` or `0`.

## Step-by-step examples

**Example 1 - savings goal**

```python
balance = 100
months = 0
while balance < 200:
    balance = balance * 1.1   # grows 10% per month
    months += 1
print("Months needed:", months)
print("Balance:", round(balance, 2))
```

Output:

```text
Months needed: 8
Balance: 214.36
```

We did not know in advance it would take 8 months - perfect for while. (`round(x, 2)` rounds to 2 decimal
places; more in Level 5.)

**Example 2 - asking until the answer is valid** (Input: `-5`, then `0`, then `7`)

```python
number = int(input("Enter a positive number: "))
while number <= 0:
    print("That is not positive, try again.")
    number = int(input("Enter a positive number: "))
print("Thank you:", number)
```

Output:

```text
Enter a positive number: -5
That is not positive, try again.
Enter a positive number: 0
That is not positive, try again.
Enter a positive number: 7
Thank you: 7
```

**Example 3 - a sentinel: keep adding until 0** (Input: `10`, `20`, `5`, `0`)

```python
total = 0
value = int(input("Number (0 to stop): "))
while value != 0:
    total += value
    value = int(input("Number (0 to stop): "))
print("Total:", total)
```

Output ends with `Total: 35`.

**Example 4 - an infinite loop (do not do this!)**

```python
count = 1
while count <= 3:
    print("Round", count)
# forgot: count += 1
```

`count` stays 1 forever, so the condition is always True. In this app, the program would be stopped after the
time limit and you would see *"Your program took too long"*.

## Common mistakes

- **Forgetting to update the variable** in the condition → infinite loop.
- **Updating in the wrong direction**: `count -= 1` when the condition is `count <= 10` → never stops.
- **Off-by-one**: `while count < 10` vs `while count <= 10` - test the boundary.
- **Asking for input only before the loop** in a validation loop - you must ask *again inside* the loop.
- **Using while where for is clearer**: counting 1 to 10 is simpler with `for i in range(1, 11)`.

## Practical application

Menus ("choose an option, or q to quit"), games ("keep playing until lives run out"), input validation ("ask
until the answer is a valid number"), retrying a network request, and simulations ("how many years until the
loan is paid off") all use while loops. The number-guessing project is built around one.

## Revision notes

- `while condition:` repeats while the condition is True; checked before each round.
- Something inside must eventually make the condition False - or you get an **infinite loop**.
- for = known sequence; while = "until something happens".
- Validation pattern: ask → `while invalid:` → explain → ask again.
- Sentinel: a special value (like 0 or "quit") that ends the loop.
- Stop a runaway program: this app's time limit, or Ctrl + C in a terminal.

```exercise
id: countdown
title: Countdown
difficulty: beginner
instructions: |
  Use a **while** loop to count down from `start` to 1, then print `Lift off!`. With `start = 5`:

  ```text
  5
  4
  3
  2
  1
  Lift off!
  ```
starter: |
  start = 5
  n = start
hints:
  - "`while n >= 1:` (or `while n > 0:`)"
  - "Inside: print n, then `n -= 1`. Without that line the loop never ends."
solution: |
  start = 5
  n = start
  while n >= 1:
      print(n)
      n -= 1
  print("Lift off!")
explanation: |
  Each iteration prints n and then decreases it. When n reaches 0 the condition becomes False and the loop ends.
check:
  expected: |
    5
    4
    3
    2
    1
    Lift off!
  requires: [while]
  variants:
    - replace: ["start = 5", "start = 2"]
      expected: |
        2
        1
        Lift off!
```

```exercise
id: positive-validation
title: Ask until valid
difficulty: beginner
instructions: |
  Ask `Age: ` repeatedly until the user enters an age between 1 and 120 (inclusive). For each invalid answer
  print `Please enter an age from 1 to 120.` When valid, print `Age accepted: <age>`.

  Example with inputs `0`, `150`, `35`:

  ```text
  Age: 0
  Please enter an age from 1 to 120.
  Age: 150
  Please enter an age from 1 to 120.
  Age: 35
  Age accepted: 35
  ```
starter: |
  age = int(input("Age: "))
hints:
  - "`while age < 1 or age > 120:`"
  - Inside the loop, print the message and ask again with the same input line.
solution: |
  age = int(input("Age: "))
  while age < 1 or age > 120:
      print("Please enter an age from 1 to 120.")
      age = int(input("Age: "))
  print("Age accepted:", age)
explanation: |
  The loop keeps asking while the answer is outside the valid range. Asking again *inside* the loop is what lets
  the condition eventually become False.
stdin: |
  0
  150
  35
check:
  cases:
    - stdin: "0\n150\n35\n"
      expected: |
        Age: 0
        Please enter an age from 1 to 120.
        Age: 150
        Please enter an age from 1 to 120.
        Age: 35
        Age accepted: 35
    - stdin: "18\n"
      expected: |
        Age: 18
        Age accepted: 18
  requires: [while]
```

```exercise
id: doubling
title: How many doublings?
difficulty: intermediate
instructions: |
  A rumour starts with 1 person, and every day the number of people who know it doubles. Using a while loop,
  find how many days it takes for at least `target` people to know it. With `target = 1000`:

  ```text
  Days: 10
  ```
starter: |
  target = 1000
  people = 1
  days = 0
hints:
  - "`while people < target:`"
  - "Inside: `people *= 2` and `days += 1`."
solution: |
  target = 1000
  people = 1
  days = 0
  while people < target:
      people *= 2
      days += 1
  print("Days:", days)
explanation: |
  After 10 doublings, 1 becomes 1024 (≥ 1000). We could not easily know "10" in advance - that is what while is
  for.
check:
  expected: |
    Days: 10
  requires: [while]
  variants:
    - replace: ["target = 1000", "target = 1000000"]
      expected: |
        Days: 20
    - replace: ["target = 1000", "target = 1"]
      expected: |
        Days: 0
```

```exercise
id: running-total
title: Running total until 0
difficulty: challenge
instructions: |
  Keep asking `Amount (0 to finish): ` and add each amount to a total. When the user types `0`, stop and print
  how many amounts were entered and the total:

  ```text
  Amount (0 to finish): 12
  Amount (0 to finish): 30
  Amount (0 to finish): 8
  Amount (0 to finish): 0
  Count: 3
  Total: 50
  ```

  Amounts are whole numbers. If the first amount is 0, print `Count: 0` and `Total: 0`.
starter: |
  total = 0
  count = 0
hints:
  - Ask once before the loop, then use `while amount != 0:`.
  - "Inside the loop: add to total, add 1 to count, then ask again."
solution: |
  total = 0
  count = 0
  amount = int(input("Amount (0 to finish): "))
  while amount != 0:
      total += amount
      count += 1
      amount = int(input("Amount (0 to finish): "))
  print("Count:", count)
  print("Total:", total)
explanation: |
  0 is the *sentinel*: it ends the loop and is not counted. Asking once before the loop and again at the end of
  each iteration is the standard pattern.
stdin: |
  12
  30
  8
  0
check:
  cases:
    - stdin: "12\n30\n8\n0\n"
      expected: |
        Amount (0 to finish): 12
        Amount (0 to finish): 30
        Amount (0 to finish): 8
        Amount (0 to finish): 0
        Count: 3
        Total: 50
    - stdin: "0\n"
      expected: |
        Amount (0 to finish): 0
        Count: 0
        Total: 0
  requires: [while]
```

```quiz
- id: q1
  question: When does a while loop stop?
  options:
    - When its condition is False at the start of a round
    - After exactly 10 rounds
    - When it reaches the end of the file
    - Never
  answer: When its condition is False at the start of a round
  explanation: The condition is checked before every iteration.
- id: q2
  question: What is wrong with this loop?
  code: |
    n = 1
    while n < 5:
        print(n)
  options:
    - n never changes, so it loops forever
    - The colon is missing
    - It prints nothing
    - range is missing
  answer: n never changes, so it loops forever
  explanation: Something inside the loop must eventually make the condition False, e.g. n += 1.
- id: q3
  question: How many times does this print "x"?
  code: |
    n = 10
    while n < 5:
        print("x")
  type: text
  answer: ["0", "zero", "none"]
  explanation: The condition is False from the start, so the block never runs.
- id: q4
  question: Which situation suits a while loop better than a for loop?
  options:
    - Asking for a password until it is correct
    - Printing the numbers 1 to 10
    - Visiting every letter of a word
    - Repeating something exactly 5 times
  answer: Asking for a password until it is correct
  explanation: You do not know in advance how many attempts it will take.
- id: q5
  question: What does this print?
  code: |
    x = 1
    while x < 20:
        x = x * 3
    print(x)
  type: text
  answer: ["27"]
  explanation: 1 → 3 → 9 → 27. 27 is not < 20, so the loop stops and 27 is printed.
- id: q6
  question: In a terminal, which keys usually stop a program stuck in an infinite loop?
  type: text
  answer: ["Ctrl+C", "ctrl c", "ctrl + c", "control c", "control+c"]
  explanation: Ctrl + C interrupts the running program. In this app the time limit stops it for you.
```
