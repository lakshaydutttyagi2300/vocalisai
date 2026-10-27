---
id: sql-0-2-what-is-sql
title: What is SQL and how does a query work?
track: sql
level: 0
order: 2
minutes: 30
summary: SQL is the language for talking to databases. Learn how a query is structured, how the database answers it, and what makes SQLite special.
objectives:
  - Explain what SQL is and what it is used for
  - Describe the parts of a simple SELECT query
  - Explain what happens when a query runs (and that it never changes data)
  - Know what SQLite is and how it differs from PostgreSQL, MySQL and SQL Server
  - Follow SQL's basic writing rules (keywords, semicolons, quotes)
prerequisites: [sql-0-1-what-is-a-database]
tags: [sql, query, select, from, sqlite, postgresql, mysql, sql server, statement, keyword]
---

## Simple explanation

**SQL** (say "S-Q-L" or "sequel") stands for **Structured Query Language**. It is the language used to talk to
relational databases. With SQL you can:

- **ask questions** - "which customers live in London?" (this is called a **query**),
- **add, change and delete** data,
- **create** and change tables.

A query describes **what** you want, not **how** to get it. You say *"give me the names of students in
Mumbai"*, and the database works out the fastest way to find them.

The simplest query has two parts:

```sql
SELECT first_name, city
FROM students;
```

- `SELECT` lists the **columns** you want to see.
- `FROM` names the **table** to look in.
- The `;` ends the statement.

The answer comes back as a **result set** - a temporary table of rows and columns. Running a `SELECT` never
changes the data in the database; it only reads.

## Real-world analogy

SQL is like **ordering at a restaurant**. You say *what* you want ("the pasta, without cheese"), not how to cook
it. The kitchen (the database engine) decides the steps. And just like ordering does not change the menu,
running a `SELECT` does not change the database.

## Technical definition

- **SQL**: a declarative language standardised by ISO/ANSI. Most databases follow the standard closely but add
  their own extras ("dialects").
- **Statement**: one complete instruction, ending with `;`. A **query** is a statement that reads data
  (`SELECT`).
- **Keyword**: a word with special meaning in SQL (`SELECT`, `FROM`, `WHERE`...). Keywords are **not
  case-sensitive** - `select` works too - but writing them in CAPITALS is a common convention that makes queries
  easier to read.
- **Identifiers**: names of tables and columns (`students`, `first_name`).
- **Literals**: fixed values - numbers (`42`, `3.5`) and text in **single quotes** (`'Mumbai'`).
- **Execution**: the database parses the statement, plans how to get the data (the *query plan*), runs the plan
  and returns the result set.
- **SQLite**: a small, fast, *serverless* database stored in a single file, built into Python - which is why this
  app needs no installation or server. **PostgreSQL**, **MySQL** and **Microsoft SQL Server** are larger
  database *servers*, used by websites and companies with many simultaneous users. The `SELECT` basics are the
  same in all of them.

| | SQLite | PostgreSQL / MySQL / SQL Server |
|---|---|---|
| Runs as | a library inside your program; data in one file | a separate server program |
| Set-up | none | install, configure users and passwords |
| Typical use | apps, phones, small tools, learning | websites, company systems, many users |
| Data types | flexible ("type affinity") | strict |

## Step-by-step examples

**Example 1 - choosing columns** (School database)

```sql
SELECT title, credits
FROM courses;
```

Returns two columns (`title`, `credits`) for every course. The columns appear in the order you list them.

**Example 2 - all columns with `*`**

```sql
SELECT *
FROM courses;
```

`*` means "every column, in the table's order". Handy for exploring; in real work, listing the columns you need
is clearer and faster.

**Example 3 - layout and case do not matter**

```sql
select title from courses;
```

```sql
SELECT title
FROM   courses;
```

Both are the same query. SQL ignores extra spaces and line breaks, and keywords work in any case. Writing each
clause on its own line, with keywords in capitals, makes long queries much easier to read.

**Example 4 - calculations and text without a table**

```sql
SELECT 7 * 6, 'hello';
```

Returns one row: `42` and `hello`. SQLite lets you calculate without a table - useful for quick experiments.

## Common mistakes

- **Double quotes for text**: in standard SQL, text values use **single quotes** `'London'`. Double quotes mean
  identifiers (names). SQLite is forgiving, but other databases are not - get used to single quotes.
- **Missing commas between columns**: `SELECT title credits FROM courses` does not fail - it treats `credits` as
  a new *name* for the title column! Always put commas between columns.
- **A comma after the last column**: `SELECT title, credits, FROM courses` → syntax error.
- **Misspelled table or column names** → `no such table` / `no such column`. Check the table list in the SQL Lab.

## Practical application

SQL is one of the most useful skills in any data-related job: analysts use it to answer business questions,
developers use it inside applications, and spreadsheets of millions of rows become manageable. Learning it on
SQLite transfers directly to PostgreSQL, MySQL, SQL Server, BigQuery and others.

## Revision notes

- **SQL** = Structured Query Language, used to read and change data in relational databases.
- `SELECT columns FROM table;` - columns you want, from which table. `*` = all columns.
- `SELECT` only **reads**; the result is a temporary **result set**.
- Keywords are case-insensitive; convention: CAPITALS. Statements end with `;`.
- Text values in **single quotes**; commas between columns.
- **SQLite** = database in a single file, no server; the basics transfer to PostgreSQL/MySQL/SQL Server.

```exercise
id: titles-credits
title: Choose two columns
difficulty: beginner
dataset: school
instructions: |
  Show the **title** and **credits** of every course (in that column order).
starter: |
  SELECT *
  FROM courses;
hints:
  - Replace the `*` with the two column names, separated by a comma.
solution: |
  SELECT title, credits
  FROM courses;
explanation: |
  The SELECT list decides which columns appear and in which order. Listing only the columns you need is clearer
  than `*`.
check:
  ordered: false
```

```exercise
id: student-names
title: Student names and cities
difficulty: beginner
dataset: school
instructions: |
  Show the **first_name**, **last_name** and **city** of every student (in that order).
starter: |
  -- write your query here

hints:
  - The table is `students`.
  - Put commas between the three column names.
solution: |
  SELECT first_name, last_name, city
  FROM students;
explanation: |
  `SELECT first_name, last_name, city FROM students;` returns those three columns for all 24 rows.
check:
  ordered: false
```

```exercise
id: missing-comma
title: The missing comma mystery
difficulty: intermediate
dataset: school
instructions: |
  This query was meant to show each course's **title** and **department**, but the result has only one column -
  called `department` - containing titles! Run it to see, then fix it.
starter: |
  SELECT title department
  FROM courses;
hints:
  - Without a comma, SQL reads `title department` as "the column title, renamed to department".
  - Add a comma between the two column names.
solution: |
  SELECT title, department
  FROM courses;
explanation: |
  A word directly after a column (without a comma) is treated as an **alias** - a new name for that column. The
  comma tells SQL that `department` is a separate column.
check:
  ordered: false
  columns: true
```

```exercise
id: quick-maths
title: SQL as a calculator
difficulty: challenge
dataset: blank
instructions: |
  Without using any table, write one query that returns a single row with **three** columns: the result of
  `24 * 7` (hours in a week), the result of `365 / 7` (whole weeks in a year - SQLite divides whole numbers
  exactly like Python's `//`), and the text `done`.
starter: |
  SELECT 24 * 7;
hints:
  - Separate the three values with commas in one SELECT.
  - Text needs single quotes - `'done'`.
solution: |
  SELECT 24 * 7, 365 / 7, 'done';
explanation: |
  SELECT can evaluate expressions without a FROM clause in SQLite. Note that `365 / 7` gives `52` because both
  numbers are integers - integer division. Write `365.0 / 7` for a decimal result. (Some databases, like
  PostgreSQL, also do integer division here; MySQL returns a decimal.)
check:
  ordered: false
```

```quiz
- id: q1
  question: What does SQL stand for?
  options:
    - Structured Query Language
    - Simple Question Logic
    - Sequential Query List
    - System Quality Level
  answer: Structured Query Language
  explanation: SQL = Structured Query Language.
- id: q2
  question: In `SELECT name FROM customers;`, what does FROM specify?
  options:
    - The table to read from
    - The columns to show
    - How to sort the result
    - Which rows to keep
  answer: The table to read from
  explanation: SELECT lists the columns; FROM names the table.
- id: q3
  question: Does running a SELECT query change the data in the database?
  options:
    - No, it only reads data
    - Yes, it sorts the table permanently
    - Yes, it deletes the rows it shows
    - Only on Mondays
  answer: No, it only reads data
  explanation: SELECT returns a temporary result set; the stored data is untouched.
- id: q4
  question: Which quote marks should you use for text values in SQL, such as London?
  options:
    - "Single quotes: 'London'"
    - 'Double quotes: "London"'
    - "Backticks: `London`"
    - No quotes
  answer: "Single quotes: 'London'"
  explanation: Standard SQL uses single quotes for text. Double quotes are for names of tables/columns.
- id: q5
  question: What is special about SQLite?
  options:
    - The whole database is a single file and no server is needed
    - It only works on the internet
    - It cannot run SELECT queries
    - It is a spreadsheet program
  answer: The whole database is a single file and no server is needed
  explanation: SQLite is a small, serverless database built into Python - ideal for learning and for apps.
- id: q6
  question: Are SQL keywords like SELECT case-sensitive?
  options:
    - No - select and SELECT both work
    - Yes - only SELECT works
    - Yes - only select works
    - Only in SQLite
  answer: No - select and SELECT both work
  explanation: Keywords are case-insensitive; capitals are just a readability convention.
```
