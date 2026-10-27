---
id: sql-0-1-what-is-a-database
title: What is a database?
track: sql
level: 0
order: 1
minutes: 25
summary: Databases, tables, rows, columns, records and fields explained with everyday examples - then your first look at real data.
objectives:
  - Explain what a database is and why people use one instead of a spreadsheet or a pile of files
  - Describe tables, rows, columns, records and fields
  - Explain what a relational database is and how tables relate to each other
  - Recognise common data types (text, whole numbers, decimal numbers, dates)
  - Run your first query to look at a table
prerequisites: []
tags: [database, table, row, column, record, field, relational, data type]
---

## Simple explanation

A **database** is an organised collection of information (**data**) stored on a computer so that it can be
found, updated and analysed quickly and reliably.

You use databases every day without seeing them: your bank account, online shopping orders, your phone's
contacts, a school's list of students - all of these live in databases.

Most databases store information in **tables**. A table looks a lot like a spreadsheet:

| id | first_name | last_name | city   |
|----|------------|-----------|--------|
| 1  | Priya      | Sharma    | Mumbai |
| 2  | Ben        | Smith     | London |
| 3  | Chen       | Wei       | Toronto|

- Each **row** is one thing - here, one student. A row is also called a **record**.
- Each **column** is one piece of information about every thing - here, the first name, last name or city. One
  value in one row (for example, Priya's city) is called a **field**.
- Every column has a **data type**: text, whole numbers, decimal numbers, dates and so on.

A database usually holds **several tables** that are connected. A school database might have a `students`
table, a `courses` table, and an `enrollments` table recording which student takes which course. This is called
a **relational database**, because tables are *related* to each other through shared values like the student's
`id`.

## Real-world analogy

Think of a **filing cabinet** in an office.

- The cabinet is the **database**.
- Each drawer is a **table** - one drawer for students, one for courses.
- Each folder in a drawer is a **row** (one student).
- Each labelled box on the form inside the folder is a **column** (name, city, birth date).

Instead of copying a student's whole address onto every course form, the course form just says "student
number 2". To find the address you look up student number 2 in the students drawer. That "look it up by
number" idea is exactly how relational databases connect tables.

## Technical definition

- **Database**: a structured collection of data managed by software called a **database management system
  (DBMS)**. Examples of DBMSs: SQLite, PostgreSQL, MySQL, Microsoft SQL Server, Oracle.
- **Table** (also *relation*): a set of rows that all have the same columns.
- **Row / record / tuple**: one entry in a table.
- **Column / field / attribute**: a named property with a data type. (People say "field" both for a column and
  for one cell value - the meaning is usually clear from context.)
- **Data type**: the kind of value a column holds. Common types: `INTEGER` (whole numbers), `REAL` (decimal
  numbers), `TEXT`, and dates (SQLite stores dates as text such as `'2026-03-15'`).
- **Primary key**: a column whose value uniquely identifies each row - usually `id`.
- **Relational database**: a database where tables are linked by matching values, usually a **foreign key**
  in one table pointing at the primary key of another (e.g. `enrollments.student_id` → `students.id`).
- **NULL**: a special marker meaning "no value / unknown". It is not zero and not empty text.

**Why not just use a spreadsheet?** Spreadsheets are great for small, personal lists. Databases are better when
there is a lot of data, many people or programs use it at the same time, the data must stay correct (rules can
be enforced), and you need fast, precise answers to questions.

## Step-by-step examples

This app includes a small **School** database. Its tables are `students`, `courses` and `enrollments`.

**Example 1 - look at a whole table**

```sql
SELECT * FROM students;
```

Read it as: "**select** every column (`*` means *all columns*) **from** the table named `students`". The result
is a grid showing every row and column of the table - 24 students.

**Example 2 - a table that links two others**

```sql
SELECT * FROM enrollments;
```

Each row says: student number `student_id` takes course number `course_id` in a `term`, with a `score` and a
`grade`. Some scores are empty (`NULL`) because those courses have not been graded yet.

**Example 3 - reading the structure**

In the SQL Lab, open the **students** table in the left panel. You will see each column's **name**, **type**
and whether it is **required** (must have a value). The `email` column is not required, so some students have
no email (NULL).

## Common mistakes

- **Thinking a database is a single table.** Real databases usually have many related tables.
- **Confusing rows and columns.** Rows go *across* and describe one thing; columns go *down* and describe one
  property.
- **Thinking NULL means zero or empty text.** NULL means "unknown" or "missing" - it is a different thing.
  (You will learn how to search for it in Level 1.)
- **Worrying about breaking the data.** The lab works on practice copies that can be reset at any time.

## Practical application

Almost every job that touches data - business analysis, marketing, finance, healthcare, software development -
involves databases. Knowing how they are organised lets you ask them questions directly instead of waiting for
someone to make you a report.

## Revision notes

- A **database** is an organised collection of data, managed by a **DBMS** (this app uses **SQLite**).
- Data lives in **tables**. **Rows (records)** are things; **columns (fields)** are properties of those things.
- Each column has a **data type**: INTEGER, REAL, TEXT, dates as text `'YYYY-MM-DD'`.
- A **primary key** (usually `id`) identifies each row. A **foreign key** points to a row in another table.
- **Relational** databases link tables through those keys.
- **NULL** = no value / unknown - not 0, not empty text.
- `SELECT * FROM table_name;` shows every column and row of a table.

```exercise
id: first-select
title: Your first query
difficulty: beginner
dataset: school
instructions: |
  The query below is already written. Press **▶ Run** to see the `students` table, then press
  **✓ Check my answer**.
starter: |
  SELECT * FROM students;
hints:
  - Click the "▶ Run" button under the box. A table of students should appear.
solution: |
  SELECT * FROM students;
explanation: |
  `SELECT *` means "all columns" and `FROM students` names the table. The result is the whole table.
check:
  ordered: false
```

```exercise
id: courses-table
title: Look at another table
difficulty: beginner
dataset: school
instructions: |
  Change the query so it shows **every column and row of the `courses` table** instead.
starter: |
  SELECT * FROM students;
hints:
  - Only the table name needs to change.
  - The table is called `courses` (all lower case, with an s at the end).
solution: |
  SELECT * FROM courses;
explanation: |
  The same pattern - `SELECT * FROM table_name;` - works for any table. Only the name changes.
check:
  ordered: false
```

```exercise
id: linking-table
title: The linking table
difficulty: intermediate
dataset: school
instructions: |
  Show the whole `enrollments` table. Then look at the result and answer for yourself:
  which column links an enrollment to a student, and which links it to a course?
  (Check the query; the thinking part is for you.)
starter: |
  -- Write your query below

hints:
  - Use the same pattern as the previous exercises.
  - The linking columns end in `_id`.
solution: |
  SELECT * FROM enrollments;
explanation: |
  `student_id` points to `students.id` and `course_id` points to `courses.id`. These are **foreign keys** -
  the "look it up by number" idea that makes the database *relational*.
check:
  ordered: false
```

```quiz
- id: q1
  question: In a table of customers, what does one **row** usually represent?
  options:
    - One customer
    - One property (such as "city") of every customer
    - The whole database
    - A data type
  answer: One customer
  explanation: Rows are things (records). Columns are properties of those things.
- id: q2
  question: What is a **column** in a table?
  options:
    - One named property that every row has, such as email or price
    - One complete record
    - A list of tables
    - A query
  answer: One named property that every row has, such as email or price
  explanation: A column (field) is a property like `email`. Every row has a value (or NULL) in it.
- id: q3
  question: What does NULL mean in a database?
  options:
    - The value is missing or unknown
    - The number zero
    - Empty text ""
    - An error in the table
  answer: The value is missing or unknown
  explanation: NULL is a special marker for "no value". It is different from 0 and from empty text.
- id: q4
  question: In the School database, `enrollments.student_id` points to `students.id`. What is `student_id` called?
  options:
    - A foreign key
    - A primary key
    - A data type
    - A row
  answer: A foreign key
  explanation: A foreign key in one table points to the primary key of another table.
- id: q5
  question: Which statement shows every column and row of a table called `orders`?
  type: text
  answer: ["SELECT * FROM orders", "SELECT * FROM orders;", "select * from orders"]
  explanation: "`SELECT * FROM orders;` - the star means all columns."
- id: q6
  question: Why might you choose a database instead of a spreadsheet?
  options:
    - Large amounts of data, many users at once, rules that keep data correct and fast precise questions
    - Databases are always prettier
    - Spreadsheets cannot store numbers
    - Databases never need a computer
  answer: Large amounts of data, many users at once, rules that keep data correct and fast precise questions
  explanation: Spreadsheets are fine for small personal lists; databases shine with size, sharing and reliability.
```
