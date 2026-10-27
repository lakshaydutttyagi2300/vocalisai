---
id: py-2-1-true-false
title: True, False and conditions
track: python
level: 2
order: 1
minutes: 25
summary: Booleans in depth - conditions, comparing text, the in operator, and how Python treats other values as "truthy" or "falsy".
objectives:
  - Write conditions that evaluate to True or False
  - Use the in operator to check whether text contains other text
  - Explain what "truthy" and "falsy" values are
  - Convert values to booleans with bool()
prerequisites: [py-1-7-comparisons]
tags: [boolean, True, False, condition, in, truthy, falsy, bool]
---

## Simple explanation

A **condition** is any expression whose answer is `True` or `False`. You already know comparisons like
`age >= 18`. Two more useful tools:

1. **`in`** checks whether one piece of text appears inside another:

   ```python
   print("cat" in "concatenate")   # True
   print("dog" in "concatenate")   # False
   ```

2. **Truthiness.** When Python needs a True/False answer but gets some other value, it decides on its own:
   **empty or zero values count as False**; everything else counts as True.

   | Counts as False ("falsy") | Counts as True ("truthy") |
   |---|---|
   | `False`, `0`, `0.0`, `""` (empty string), `None` | `True`, any non-zero number, any non-empty string like `"no"` or `" "` |

This matters in the next lesson, where `if` statements run code only when a condition is True.

## Real-world analogy

A condition is like a **light switch**: it is either on (`True`) or off (`False`), never "half". Truthiness is
like asking "is there anything in the box?" - an empty box (`""`, `0`) means *no*, a box with anything inside
means *yes*.

## Technical definition

- **Boolean expression / condition**: an expression evaluating to a `bool`.
- **Membership operator** `in` (and `not in`): for strings, `a in b` is `True` if `a` is a **substring** of `b`.
  It is case-sensitive. Later it also works for lists, dictionaries and more.
- **Truth value testing**: every object has a truth value. `bool(x)` returns it. Falsy: `False`, `None`, zero of
  any numeric type, empty sequences/collections (`""`, `[]`, `{}`...). Everything else is truthy.
- `True` and `False` behave like the integers `1` and `0` in arithmetic (`True + True` is `2`) - occasionally
  handy for counting.

## Step-by-step examples

**Example 1 - storing conditions**

```python
temperature = 31
is_hot = temperature > 30
is_freezing = temperature <= 0
print(is_hot, is_freezing)
```

Output: `True False`

**Example 2 - searching text with in**

```python
email = "asha@example.com"
print("@" in email)
print(".com" in email)
print("Example" in email)
```

Output:

```text
True
True
False
```

The last is `False` because `in` is case-sensitive.

**Example 3 - not in**

```python
password = "sunshine"
print("123" not in password)
```

Output: `True` (the password does not contain any digits "123").

**Example 4 - truthiness with bool()**

```python
print(bool(0))
print(bool(42))
print(bool(""))
print(bool("False"))
```

Output:

```text
False
True
False
True
```

Surprise: `bool("False")` is `True`! It is a *non-empty string*, so it is truthy. Only the actual value `False`
is false.

**Example 5 - counting with booleans**

```python
answers_correct = (2 + 2 == 4) + (3 * 3 == 9) + (10 / 2 == 4)
print(answers_correct)
```

Output: `2` - two conditions were True (1 + 1 + 0).

## Common mistakes

- **Thinking `"False"` (a string) is false** - it is truthy because it is not empty.
- **Case-sensitivity with `in`**: `"Cat" in "a cat"` is `False`.
- **Spaces count as characters**: `" "` (one space) is a non-empty string, so it is truthy.
- **Confusing `in` with `==`**: `"cat" in "category"` is `True`, but `"cat" == "category"` is `False`.

## Practical application

Validating input uses exactly these tools: *does the email contain "@"? Did the user type anything at all
(`bool(answer)`)? Is the forbidden word not in the message?* Truthiness also lets you write natural code such as
"if the name is not empty" - you will see this in the next lesson.

## Revision notes

- A **condition** evaluates to `True` or `False`.
- `"sub" in "text"` → True if the text contains "sub" (case-sensitive). `not in` is the opposite.
- **Falsy**: `False`, `0`, `0.0`, `""`, `None` (and empty collections). Everything else is **truthy**.
- `bool(x)` shows how Python judges `x`. `bool("False")` is `True`!
- `True` counts as 1 and `False` as 0 in arithmetic.

```exercise
id: email-check
title: Does it look like an email?
difficulty: beginner
instructions: |
  Ask `Email: ` and print whether the answer contains an `@` symbol. For `sam@mail.com`:

  ```text
  Email: sam@mail.com
  Has @: True
  ```
starter: |
  email = input("Email: ")
hints:
  - "`\"@\" in email` is True when the email contains @."
solution: |
  email = input("Email: ")
  print("Has @:", "@" in email)
explanation: |
  The `in` operator checks whether one string appears inside another and gives True or False.
stdin: "sam@mail.com"
check:
  cases:
    - stdin: "sam@mail.com"
      expected: |
        Email: sam@mail.com
        Has @: True
    - stdin: "sam.mail.com"
      expected: |
        Email: sam.mail.com
        Has @: False
  requires: []
  require_text: [" in "]
```

```exercise
id: truthy-table
title: Truthy or falsy?
difficulty: beginner
instructions: |
  Print the truth value (using `bool()`) of each of these values, one per line, in this order:
  `0`, `-3`, `""`, `"0"`, `0.0`

  Predict the answers first! The output must be:

  ```text
  False
  True
  False
  True
  False
  ```
starter: |
  print(bool(0))
hints:
  - "Zero of any kind and the empty string are falsy."
  - "`\"0\"` is a string with one character in it - not empty."
solution: |
  print(bool(0))
  print(bool(-3))
  print(bool(""))
  print(bool("0"))
  print(bool(0.0))
explanation: |
  Only zero values and empty strings are falsy. Negative numbers are non-zero, so truthy. `"0"` contains a
  character, so it is truthy.
check:
  expected: |
    False
    True
    False
    True
    False
  requires: ["call:bool"]
```

```exercise
id: spam-filter
title: A tiny spam filter
difficulty: intermediate
instructions: |
  Ask `Message: `. A message is suspicious if it contains the word `free` **or** the word `winner`
  (lower case is fine for now). Store the result in `suspicious` and print it.

  Hint: you can combine two conditions with `or` - you will learn more about `or` in lesson 3 of this level.

  For `You are a winner!`:

  ```text
  Message: You are a winner!
  Suspicious: True
  ```
starter: |
  message = input("Message: ")
hints:
  - "`\"free\" in message` checks for one word."
  - "`suspicious = \"free\" in message or \"winner\" in message`"
solution: |
  message = input("Message: ")
  suspicious = "free" in message or "winner" in message
  print("Suspicious:", suspicious)
explanation: |
  Each `in` gives True/False; `or` makes the whole condition True when at least one part is True.
stdin: "You are a winner!"
check:
  cases:
    - stdin: "You are a winner!"
      expected: |
        Message: You are a winner!
        Suspicious: True
    - stdin: "Get it free today"
      expected: |
        Message: Get it free today
        Suspicious: True
    - stdin: "See you at lunch"
      expected: |
        Message: See you at lunch
        Suspicious: False
```

```exercise
id: count-true
title: Count the correct answers
difficulty: challenge
instructions: |
  Three quiz answers are stored in variables. Using the fact that `True` counts as 1 and `False` as 0, calculate
  how many answers are correct **in one expression** (no `if`), store it in `score` and print:

  ```text
  Score: 2 out of 3
  ```

  The correct answers are: capital is "Paris", planets is 8, boiling is 100.
starter: |
  capital = "Paris"
  planets = 9
  boiling = 100
hints:
  - "`capital == \"Paris\"` is True (1) or False (0)."
  - "Add the three comparisons together: `(...) + (...) + (...)`."
solution: |
  capital = "Paris"
  planets = 9
  boiling = 100
  score = (capital == "Paris") + (planets == 8) + (boiling == 100)
  print("Score:", score, "out of 3")
explanation: |
  Each comparison is a boolean. In arithmetic True behaves like 1 and False like 0, so adding them counts the
  True ones.
check:
  expected: |
    Score: 2 out of 3
  tests:
    - name: score is the number 2
      code: |
        assert score == 2
  variants:
    - replace: ["planets = 9", "planets = 8"]
      expected: |
        Score: 3 out of 3
  forbid: [if]
```

```quiz
- id: q1
  question: What does `print("ana" in "banana")` show?
  type: text
  answer: ["True"]
  explanation: '"ana" appears inside "banana", so it is True.'
- id: q2
  question: Which value is **falsy**?
  options:
    - '""'
    - '"False"'
    - "-1"
    - '" "'
  answer: '""'
  explanation: Only the empty string is falsy here. "False" and " " are non-empty strings; -1 is a non-zero number.
- id: q3
  question: What does `print(bool("0"))` show?
  type: text
  answer: ["True"]
  explanation: '"0" is a string containing one character - non-empty, so truthy.'
- id: q4
  question: What does `print("Hello" in "hello world")` show?
  type: text
  answer: ["False"]
  explanation: The `in` check is case-sensitive - capital H is not in the text.
- id: q5
  question: What does `print(True + True + False)` show?
  type: text
  answer: ["2"]
  explanation: In arithmetic True is 1 and False is 0.
- id: q6
  question: Which of these is a condition (evaluates to True or False)?
  options:
    - "price > 100"
    - "price = 100"
    - "price + 100"
    - '"price"'
  answer: "price > 100"
  explanation: A comparison produces a boolean. `price = 100` is an assignment, not a question.
```
