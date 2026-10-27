---
id: debugging-guide
title: A step-by-step debugging guide
category: Reference
order: 7
tags: [debugging, bugs, errors, problem solving, print, rubber duck]
---

When something does not work, follow these steps in order. Most problems are solved by step 3.

## 1. Read the whole error message - slowly

Start at the **last line**: the error type and the message. Then find the **line number**. Then read the code
line printed in the traceback and the `^` markers under it. The message usually says exactly what is wrong.

## 2. Look at the line - and the line above

Syntax errors are often caused by the line *before* the reported one: a missing `)`, `"` or `:`.

## 3. Check the usual suspects

- Spelling and capital letters of names (`Print`, `totl`).
- Quotes around text; no quotes around variable names.
- `=` (store) versus `==` (compare).
- Indentation: 4 spaces per level, consistent.
- Types: is that value text from `input()` that needs `int()`?
- In SQL: single quotes around text, commas between columns, clause order.

## 4. Make the problem visible

Add `print()` calls to see what your program is really doing:

```python
print("DEBUG total =", total, type(total))
```

Print inside loops to see each step. In SQL, run parts of your query on their own: first just the FROM and
WHERE, then add GROUP BY, and so on.

## 5. Make it smaller

Remove or comment out code until the problem disappears - the last thing you removed contains the bug. Test
with tiny, simple inputs where you know the right answer.

## 6. Change one thing at a time

After each change, run again. If you change five things at once, you will not know which one mattered (and you
might add new bugs).

## 7. Explain it out loud ("rubber duck debugging")

Explain your code line by line to someone - or to a rubber duck, or in a note in this app. Saying "and here the
loop adds one to... oh!" finds a surprising number of bugs.

## 8. Search

Copy the last line of the error into the Knowledge Base search (or a web search). Thousands of people have had
the same error.

## 9. Take a break

Seriously. A 10-minute walk often solves what an hour of staring could not.

## 10. Learn from it

When you fix a bug, write a short note: what the error said, what caused it, how you fixed it. Your notes become
your personal error guide.
