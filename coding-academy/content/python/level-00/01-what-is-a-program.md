---
id: py-0-1-what-is-a-program
title: What is a computer program?
track: python
level: 0
order: 1
minutes: 25
summary: Programs, code and programming languages explained from zero - and your very first press of the Run button.
objectives:
  - Explain in your own words what a computer program is
  - Describe what programming and "code" mean
  - Explain why computers need exact instructions, followed in order
  - Say what a programming language is and why Python is a good first one
  - Tell the difference between a file, a program and an application, and between source code and output
prerequisites: []
tags: [program, code, programming language, python, output, source code, application]
---

## Simple explanation

A **computer program** is a list of instructions that tells a computer what to do.

That is really all it is. Your web browser, a calculator app, a game, the app you are using right now - each
one is a (sometimes very long) list of instructions written by people.

**Programming** (also called **coding**) means *writing* those instructions. The instructions themselves are
called **code**.

Computers are extremely fast and extremely obedient, but they have **no common sense**. A computer does
*exactly* what the instructions say, one instruction after another, in order - even when the instructions
are silly. If the instructions are wrong, the computer will do the wrong thing very quickly and very
precisely. That is why programmers must be clear and exact.

People cannot easily write instructions in the computer's own internal language (long patterns of 0s and 1s).
Instead we use a **programming language**: a language with strict rules that is readable by people *and* can
be translated for the computer. **Python** is one of the most popular programming languages in the world. It
was designed to be easy to read, which makes it a great first language. Python is used for websites, data
analysis, automating boring tasks, science, artificial intelligence and much more.

## Real-world analogy

Think of a **recipe**.

- The recipe is the **program**: a list of steps.
- You, the cook, are the **computer**: you follow the steps in order.
- The language the recipe is written in (English, Hindi, French...) is the **programming language**.
- The finished dish is the **output**: the result you can see.

A good recipe says "Bake for 20 minutes at 180°C", not "bake until it feels right". A computer is like a cook
who has never cooked before and will follow every word literally. If the recipe says "add salt" but forgets to
say how much, a human cook guesses. A computer cannot guess - it stops with an *error*, or does something
unexpected.

## Technical definition

- **Program**: a set of instructions, written in a programming language, that a computer can carry out
  (*execute*).
- **Code / source code**: the text of a program as written by a person. Python source code is plain text,
  usually saved in a file whose name ends in `.py`.
- **Programming language**: a formal language with precise rules (its *syntax*) for writing programs.
  Python is a *high-level* language (close to human language) and an *interpreted* language: a program called
  the **Python interpreter** reads your code and carries it out line by line.
- **Executing / running** a program: asking the computer to carry out its instructions.
- **Output**: what a program produces - text on the screen, a file, a picture, and so on.

**File, program and application - what is the difference?**

| Word | Meaning | Example |
|---|---|---|
| **File** | A named container for information stored on your computer | `holiday.jpg`, `notes.txt`, `hello.py` |
| **Program** | Instructions a computer can run. A small program can be a single file | `hello.py` |
| **Application (app)** | A complete program (often many files together) built for people to use | Your web browser, this Coding Academy |

So a program is *stored in* one or more files, and an application is a bigger, finished program made for
users.

## Step-by-step examples

**Example 1 - the smallest useful Python program**

```python
print("Hello, world!")
```

What each part means:

- `print` is the name of a built-in Python instruction (a *function*) that shows text on the screen.
- The round brackets `( )` hold the information we give to `print`.
- `"Hello, world!"` is a piece of text. The quote marks `"` tell Python where the text starts and ends.

When you run it, the **output** is:

```text
Hello, world!
```

Notice that the quote marks are *not* shown in the output. They are part of the code, not part of the text.

**Example 2 - instructions run in order, top to bottom**

```python
print("First, boil the water.")
print("Then, add the pasta.")
print("Finally, wait 10 minutes.")
```

Output:

```text
First, boil the water.
Then, add the pasta.
Finally, wait 10 minutes.
```

Python runs line 1, then line 2, then line 3. If you swapped two lines, the output order would change too.

**Example 3 - source code versus output**

```python
print(2 + 3)
```

The **source code** contains `2 + 3`. The **output** is `5`. Python *calculated* the answer and printed the
result. The code describes *what to do*; the output is *what happened*.

## Common mistakes

- **Thinking the computer will "understand what you meant".** It will not. Spelling, capital letters and
  punctuation all matter. `Print("hi")` (capital P) does not work - Python only knows `print`.
- **Forgetting the quote marks around text.** `print(Hello)` makes Python look for something *named* Hello,
  and it fails. Text needs quotes: `print("Hello")`.
- **Mixing up code and output.** The code is what you write; the output is what appears after you run it.
- **Being afraid of breaking the computer.** In this app your code runs in a safe, time-limited practice area.
  Experimenting is how you learn - you cannot damage anything by trying.

## Practical application

Everything you will build in this course - calculators, expense trackers, data reports - is a list of
instructions like the ones above, just longer. Even professional software is made from these same simple
ideas: instructions, in order, producing output.

## Revision notes

- A **program** is a list of instructions for a computer. **Programming/coding** = writing them. The text you
  write is **code** (source code).
- Computers follow instructions **exactly** and **in order**. They have no common sense.
- A **programming language** has strict rules. **Python** is popular, readable and a great first language.
- `print("text")` shows text on the screen. Quote marks mark where text starts and ends.
- **Source code** = what you write. **Output** = what the program produces when it runs.
- **File** = stored information; **program** = runnable instructions; **application** = a complete program
  for users.

```exercise
id: run-hello
title: Press Run for the first time
difficulty: beginner
instructions: |
  The code below is already complete. Your only job is to learn the buttons:

  1. Press **▶ Run**. The output `Hello, world!` should appear below the editor.
  2. Press **✓ Check my answer**. The app runs automatic checks and tells you if the exercise is solved.
starter: |
  print("Hello, world!")
hints:
  - Find the button labelled "▶ Run" just under the code box and click it once.
  - After you have seen the output, click "✓ Check my answer".
solution: |
  print("Hello, world!")
explanation: |
  `print(...)` shows whatever is inside the brackets. Because "Hello, world!" is inside quote marks, Python
  treats it as text and prints it exactly - without the quote marks.
check:
  expected: |
    Hello, world!
```

```exercise
id: change-message
title: Change the message
difficulty: beginner
instructions: |
  Change the program so that it prints **exactly** this:

  ```text
  I am learning Python!
  ```

  Click inside the code box, change the text between the quote marks, then Run and Check.
starter: |
  print("Hello, world!")
hints:
  - Only change the text *inside* the quote marks. Keep `print(`, the quote marks and the `)`.
  - Capital letters, spaces and the exclamation mark all matter. Compare your output letter by letter.
solution: |
  print("I am learning Python!")
explanation: |
  The text inside the quotes is printed exactly as written, so changing it changes the output. The rest
  of the line (`print(` ... `)`) stays the same.
check:
  expected: |
    I am learning Python!
```

```exercise
id: three-lines
title: A three-step recipe
difficulty: intermediate
instructions: |
  Write a program with **three** `print` lines that prints these lines, in this order:

  ```text
  Step 1: Fill the kettle.
  Step 2: Boil the water.
  Step 3: Make the tea.
  ```
starter: |
  print("Step 1: Fill the kettle.")
hints:
  - Each line of output needs its own `print(...)` line in your code.
  - Copy the first line and change the text for steps 2 and 3.
solution: |
  print("Step 1: Fill the kettle.")
  print("Step 2: Boil the water.")
  print("Step 3: Make the tea.")
explanation: |
  Python runs the lines from top to bottom, so the steps are printed in the order you wrote them.
check:
  expected: |
    Step 1: Fill the kettle.
    Step 2: Boil the water.
    Step 3: Make the tea.
```

```exercise
id: code-vs-output
title: Code versus output
difficulty: challenge
instructions: |
  Write **one** line of code that makes Python *calculate* 7 + 8 and print the answer.
  The output must be just the number:

  ```text
  15
  ```

  Important: do **not** type the number 15 yourself - let Python do the maths.
starter: |
  # Write your line below this comment

hints:
  - Numbers do not need quote marks. `print(1 + 1)` prints `2`.
  - If you put quote marks around `7 + 8`, Python prints the text "7 + 8" instead of calculating it.
solution: |
  print(7 + 8)
explanation: |
  Without quote marks, `7 + 8` is a calculation. Python works out the answer first and then `print`
  shows the result, `15`. With quote marks, `"7 + 8"` would just be text.
check:
  expected: |
    15
  require_text: ["7", "8", "+"]
  forbid_text: ["15"]
```

```quiz
- id: q1
  question: What is a computer program?
  options:
    - A list of instructions that a computer carries out
    - A picture on the screen
    - A type of computer
    - The electricity that powers a computer
  answer: A list of instructions that a computer carries out
  explanation: A program is a set of instructions. Pictures on the screen are often *output* of programs.
- id: q2
  question: Which statement about computers is true?
  options:
    - They guess what you meant if the instructions are unclear
    - They follow instructions exactly and in order
    - They skip instructions that look wrong
    - They run the last instruction first
  answer: They follow instructions exactly and in order
  explanation: Computers have no common sense. They do exactly what the code says, from top to bottom.
- id: q3
  question: What is the output of this program?
  code: |
    print("Good")
    print("morning")
  options:
    - "Good morning (on one line)"
    - "Good, then morning on the next line"
    - "\"Good\" \"morning\" with quote marks"
    - Nothing
  answer: "Good, then morning on the next line"
  explanation: Each `print` writes its own line, and the quote marks are not part of the output.
- id: q4
  question: What does `print(2 + 2)` output?
  type: text
  answer: ["4"]
  explanation: Without quote marks, `2 + 2` is calculated, so the output is `4`.
- id: q5
  question: Which is the best description of "source code"?
  options:
    - The text of a program that a person writes
    - The result shown after running a program
    - The place where Python is installed
    - A secret password
  answer: The text of a program that a person writes
  explanation: Source code is what you write. Output is what you get when it runs.
- id: q6
  question: Which of these is an application rather than just a file?
  options:
    - A web browser
    - holiday.jpg
    - notes.txt
    - "A single line: print(\"hi\")"
  answer: A web browser
  explanation: An application is a complete program built for people to use. The others are files (or a tiny piece of code).
```
