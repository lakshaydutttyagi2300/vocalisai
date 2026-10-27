---
id: proj-py-03-quiz-app
title: Quiz app
track: python
order: 3
difficulty: beginner
summary: A multiple-choice quiz that shuffles questions, checks answers, explains mistakes and gives a final score - with the questions stored as data, not code.
internet: false
skills: [py-4-1-lists, py-4-4-dictionaries, py-4-5-nested-and-choosing, py-5-2-fstrings-split-join, py-6-1-defining-functions, py-7-2-csv-json]
demo_input: |
  b
  x
  a
  c
starter: |
  questions = [
      {"question": "What does print() do?",
       "options": ["Shows text on the screen", "Saves a file", "Deletes a variable"],
       "answer": 0},
  ]

  # your code here: ask each question, check the answer, count the score
stages:
  - name: Beginner
    description: A working quiz.
    tasks:
      - {id: b1, text: "Questions are stored in a list of dictionaries (question, options, answer)"}
      - {id: b2, text: "Each question is shown with lettered options a, b, c"}
      - {id: b3, text: "The program says Correct / Wrong after each answer and shows the final score"}
  - name: Intermediate
    description: A better experience.
    tasks:
      - {id: i1, text: "Invalid answers (not a/b/c) are asked again"}
      - {id: i2, text: "A wrong answer shows the right one and a short explanation"}
      - {id: i3, text: "Questions are shuffled each time (random.shuffle on a copy)"}
      - {id: i4, text: "The end shows the score as a percentage and lists the questions that were missed"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Load the questions from a JSON file so you can add questions without changing code"}
      - {id: e2, text: "Shuffle the options too (keep track of where the right answer moved)"}
      - {id: e3, text: "Save every attempt (date, score) to a CSV file and show your best score"}
      - {id: e4, text: "Add a timer: show how long the quiz took"}
---

## Goal

Build the kind of quiz this app uses - and learn the important idea of **separating data from code**: the
questions are data; the program just asks whatever questions it is given.

## Example run

```text
Question 1 of 3: Which symbol starts a comment in Python?
  a) //
  b) #
  c) --
Your answer: b
Correct!

Question 2 of 3: What is 7 // 2?
  a) 3.5
  b) 4
  c) 3
Your answer: x
Please answer a, b or c.
Your answer: a
Wrong - the answer is c) 3. // divides and rounds down to a whole number.
...
You scored 2/3 (67%).
```

## Step-by-step plan

1. Store questions as dictionaries with `question`, `options` (list), `answer` (index) and `explanation`.
2. Loop over the questions with `enumerate`; print options with letters using `"abc"[i]`.
3. Read the answer, convert the letter to an index with `"abc".index(letter)`, compare.
4. Count the score; collect missed questions.
5. Shuffle a copy of the list; then (extension) move questions into a JSON file.

## Hints

- `letters = "abcdefgh"[:len(options)]` works for any number of options.
- `random.shuffle(questions)` shuffles **in place** - shuffle a copy (`list(questions)`) if you need the
  original order later.
- `round(100 * score / total)` gives a whole-number percentage.

## Sample solution

```python
import random

QUESTIONS = [
    {"question": "Which symbol starts a comment in Python?", "options": ["//", "#", "--"], "answer": 1,
     "explanation": "Python comments start with #."},
    {"question": "What is 7 // 2?", "options": ["3.5", "4", "3"], "answer": 2,
     "explanation": "// divides and rounds down to a whole number."},
    {"question": "Which type is 'hello'?", "options": ["str", "int", "list"], "answer": 0,
     "explanation": "Text in quotes is a string (str)."},
]


def ask(question, number, total):
    letters = "abcdefgh"[:len(question["options"])]
    print(f"\nQuestion {number} of {total}: {question['question']}")
    for letter, option in zip(letters, question["options"]):
        print(f"  {letter}) {option}")
    while True:
        reply = input("Your answer: ").strip().lower()
        if len(reply) == 1 and reply in letters:
            return letters.index(reply)
        print(f"Please answer {', '.join(letters[:-1])} or {letters[-1]}.")


def run_quiz(questions, shuffle=True):
    questions = list(questions)
    if shuffle:
        random.shuffle(questions)
    score, missed = 0, []
    for number, question in enumerate(questions, start=1):
        choice = ask(question, number, len(questions))
        right = question["answer"]
        if choice == right:
            score += 1
            print("Correct!")
        else:
            missed.append(question["question"])
            print(f"Wrong - the answer is {'abcdefgh'[right]}) {question['options'][right]}. "
                  f"{question['explanation']}")
    print(f"\nYou scored {score}/{len(questions)} ({round(100 * score / len(questions))}%).")
    for text in missed:
        print("  Review:", text)
    return score


run_quiz(QUESTIONS, shuffle=False)
```

## Test your program

Answer everything right, everything wrong, and type invalid letters, capitals (`B`) and spaces. Add a fourth
question with four options to check that your letters adapt automatically.
