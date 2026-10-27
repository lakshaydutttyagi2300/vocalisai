# Content format reference

Lessons, projects and articles are plain-text **Markdown** files with small **YAML** parts. YAML is a simple
"name: value" format. If a file has a mistake, the app shows a *content file problem* message naming the file
and the problem; everything else keeps working.

## Where files go

| Kind | Built-in location | Your own location |
|---|---|---|
| Python lesson | `content/python/level-XX/NN-name.md` | `my_content/lessons/anything.md` |
| SQL lesson | `content/sql/level-XX/NN-name.md` | `my_content/lessons/anything.md` |
| Level titles | `content/<track>/levels.yaml` | - |
| Article | `content/knowledge/*.md` | `my_content/knowledge/*.md` |
| Help page | `content/help/*.md` | - |
| Project | `content/projects/<track>/*.md` | - |
| SQL sample database | `content/sql/datasets/*.sql` | - |

## Lesson file

```markdown
---
id: py-1-3-variables            # unique, never change once people have progress on it
title: Variables and values
track: python                   # python or sql
level: 1                        # which level it belongs to
order: 3                        # position inside the level
minutes: 30
summary: One sentence shown under the title.
objectives:
  - First learning objective
  - Second learning objective
prerequisites: [py-1-1-print]   # ids of earlier lessons (optional)
tags: [variable, assignment]
---

## Simple explanation
...
## Real-world analogy
...
## Technical definition
...
## Step-by-step examples
...
## Common mistakes
...
## Practical application
...
## Revision notes
...

```exercise
... (see below) ...
```

```quiz
... (see below) ...
```
```

The seven `##` sections above are the standard structure (the automated tests require them for built-in
lessons). Extra `##` sections are shown after them. Completion criteria and "what next" are generated
automatically.

## Python exercise block

````markdown
```exercise
id: total-cost                  # unique within the lesson
title: Calculate with variables
difficulty: beginner            # beginner | intermediate | challenge
instructions: |
  What to do. Markdown allowed. Indent every line by two spaces.
starter: |
  ticket_price = 12
hints:
  - First hint
  - Second hint
solution: |
  ticket_price = 12
  print(ticket_price * 4)
explanation: |
  Why the solution works.
stdin: ""                       # optional default text for the Input box
check:
  expected: |                   # exact printed output (trailing spaces ignored)
    48
  cases:                        # or several inputs, each with its expected output
    - {stdin: "5\n3\n", expected: "First: 5\nSecond: 3\nSum: 8\n"}
  variants:                     # re-run with a line changed, to prove the code is general
    - replace: ["ticket_price = 12", "ticket_price = 10"]
      expected: "40\n"
  contains: ["Total"]           # output must contain these
  tests:                        # Python asserts run after the learner's code
    - name: total holds 48
      code: assert total == 48
  requires: [for, f-string]     # constructs the code must use
  forbid: [while]               # constructs it must not use
  require_text: ["+"]           # text the code must contain
  forbid_text: ["48"]           # text it must not contain (e.g. a typed answer)
  min_comments: 2
  ignore_case: false
```
````

`check: {type: manual}` makes a self-assessed task with an "I have done this" button.

Constructs for `requires`/`forbid`: `for while if elif else def return class try with import break continue
yield lambda f-string list-comprehension dict-comprehension set-comprehension generator-expression list dict
tuple set slice assert raise global augmented-assignment boolean-operator comment inline-comment nested-if
nested-loop decorator type-hints variable call:NAME method:NAME`.

Inside `tests`, the variable `OUTPUT` holds everything printed, `SOURCE` holds the learner's code as text, and
`capture_output(func, *args)` returns `(return_value, printed_text)`.

**Expected output with `input()`:** the lab shows the prompt *and* the typed answer, like a terminal. So
`name = input("Name? ")` with input `Sam` prints `Name? Sam` followed by a new line.

## SQL exercise block

````markdown
```exercise
id: london-students
title: Students in London
difficulty: beginner
dataset: school                 # a file name from content/sql/datasets (without .sql)
instructions: |
  ...
starter: |
  SELECT first_name FROM students;
hints: [...]
solution: |
  SELECT first_name, last_name FROM students WHERE city = 'London';
explanation: |
  ...
check:
  ordered: false                # true when row order matters (ORDER BY exercises)
  columns: true                 # also compare column names (for AS exercises)
  verify: SELECT * FROM courses ORDER BY id;   # for INSERT/UPDATE/DELETE/CREATE exercises
  require_text: [BEGIN, ROLLBACK]  # words the answer must contain (comments ignored, any case)
```
````

A `verify` query runs after the learner's SQL on the same fresh copy of the dataset, and its result is compared
with the result of running the model solution followed by the same `verify` query. Useful verify queries:
`SELECT ... FROM pragma_table_info('t')` (columns, NOT NULL, primary key), `pragma_foreign_key_list('t')`,
`pragma_index_list('t')`, and `INSERT OR IGNORE ...; SELECT COUNT(*) ...` to prove that a UNIQUE / CHECK /
NOT NULL constraint rejects bad rows.

## Quiz block

````markdown
```quiz
- id: q1
  question: What does `print(2 + 2)` show?
  type: text                    # typed answer; compared ignoring case/extra spaces/trailing ;
  answer: ["4", "four"]
  explanation: Why.
- id: q2
  question: Which is a string?
  code: |                       # optional code shown with the question
    x = "5"
  options:
    - '"5"'
    - "5"
  answer: '"5"'                 # must be exactly one of the options
  explanation: Why.
```
````

**YAML tips:** if a line's text contains `: ` (colon + space) or starts with a quote, `[`, `{`, `*`, `&`, `!`, `|`
or `>`, wrap the whole value in quotes. Use single quotes `'...'` when the text contains double quotes (write a
single quote inside as `''`).

## Article file

```markdown
---
id: my-sql-tips          # optional for your own files (the file name is used)
title: My SQL tips       # optional - otherwise the first "# " heading is used
category: My articles    # optional
order: 10                # optional
tags: [sql]
---

# My SQL tips

## Section
Text...
```

## Project file

```markdown
---
id: proj-py-calculator
title: Calculator
track: python
order: 1
difficulty: beginner
summary: One sentence.
internet: false
dataset: shop            # SQL projects: which sample database
skills: [py-1-5-arithmetic, py-2-2-if-elif-else]
demo_input: |                # Python projects: answers fed to input() when the tests run the sample solution
  12
  +
starter: |
  # starter code opened in the Python Lab
stages:
  - name: Beginner
    description: ...
    tasks:
      - {id: b1, text: The program asks for two numbers}
  - name: Intermediate
    tasks: [...]
  - name: Extension ideas
    required: false
    tasks: [...]
---

## Goal
...

## Hints
(shown in a collapsed "open only when you're stuck" box)

## Sample solution
(shown in a collapsed box; the first ```python block - or every ```sql block, in order, on the
project's dataset - is run by the tests, so it must work)
```

Projects are self-assessed: the learner ticks each task. Stages named Beginner and Intermediate are required to
complete a project; mark extra stages `required: false`.

## After editing

Refresh the browser page. To check every built-in lesson automatically, run the tests
(`.venv\Scripts\python -m pytest tests/test_content.py` on Windows).
