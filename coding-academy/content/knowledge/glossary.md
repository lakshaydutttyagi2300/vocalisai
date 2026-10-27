---
id: glossary
title: Glossary - programming and database words explained
category: Reference
order: 1
tags: [glossary, terms, definitions, vocabulary]
---

Plain-English meanings of the technical words used in this app, in alphabetical order. Search the Knowledge
Base for any word to jump straight to it.

## Aggregate function
An SQL function that turns many rows into one value: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. See SQL lesson
*Counting and totals*.

## Alias
A temporary new name for a column or table in an SQL query: `price * 2 AS double_price`, `FROM customers AS c`.

## API (Application Programming Interface)
A set of rules that lets one program talk to another. A *web API* lets your program ask a website for data
(for example, weather) over the internet, usually receiving JSON.

## Application (app)
A complete program made for people to use, often built from many files. Example: this Coding Academy.

## Argument
A value you give to a function when you call it. In `print("Hi", 5)`, `"Hi"` and `5` are arguments.

## Assignment
Storing a value under a name with `=`: `age = 30`. Read `=` as "gets".

## Backup
A copy of your data kept somewhere safe so you can restore it if something goes wrong. In this app: a `.zip`
file made on the *Backup & Restore* page.

## Boolean (bool)
A value that is either `True` or `False`. Comparisons such as `5 > 3` produce booleans.

## Bug
A mistake in a program. Removing bugs is **debugging**.

## Class
A blueprint for creating objects, defining their data (attributes) and behaviour (methods). Python Level 9.

## Code / source code
The text of a program, written by a person in a programming language.

## Column
In a database table, a named property that every row has (like `email`). Also called a field or attribute.

## Command
An instruction typed into a terminal, such as `cd Documents` or `py --version`.

## Comment
A note in code that the computer ignores. In Python it starts with `#`; in SQL with `--`.

## Comparison operator
Symbols that compare values: `==`, `!=`, `<`, `>`, `<=`, `>=` in Python; `=`, `<>`, `<`, `>`... in SQL.

## Concatenation
Joining pieces of text together. Python: `"a" + "b"`. SQLite: `'a' || 'b'`.

## Condition
An expression that is True or False, used by `if`, `while` and SQL `WHERE`.

## CSV (Comma-Separated Values)
A plain-text file format for tables: one row per line, values separated by commas. Opens in Excel.

## Database
An organised collection of data managed by software (a DBMS) so it can be stored, searched and updated safely.

## Data type
The kind of a value - text, whole number, decimal number, true/false, date - which decides what you can do
with it.

## DBMS (Database Management System)
The software that manages a database: SQLite, PostgreSQL, MySQL, SQL Server.

## Debugging
Finding and fixing bugs - reading error messages, printing values, testing step by step.

## Dependency
A package your program needs in order to run. This app's dependencies are listed in `requirements.txt`.

## Dictionary (dict)
A Python collection of key-value pairs: `{"name": "Asha", "age": 30}`. Python Level 4.

## Directory
Another word for folder.

## Exception
Python's word for an error that happens while the program runs (`NameError`, `ValueError`...). It can be
handled with `try` / `except`.

## Execute / run
To make the computer carry out a program's instructions.

## Expression
Anything that produces a value: `2 + 3`, `price * qty`, `name.upper()`, `age >= 18`.

## Extension (file extension)
The end of a file name after the last dot, hinting at its type: `.py`, `.txt`, `.csv`, `.zip`.

## f-string
A Python string with an `f` before it that can contain values in braces: `f"Total: {total}"`. Python Level 5.

## Field
One piece of information in a record - either a column of a table or one cell value.

## File
A named piece of stored information on a disk.

## Float
A Python number with a decimal point, such as `3.14`.

## Foreign key
A column that refers to the primary key of another table, linking the two (e.g. `orders.customer_id` →
`customers.id`).

## Framework
A large collection of ready-made code that gives an application its structure. This app uses the **Streamlit**
framework for its interface.

## Function
A named, reusable block of code. You **call** it with brackets: `print(...)`, `len(...)`, or your own
`def greet(name): ...`.

## Index (list index)
The position number of an item in a list or string, starting at 0: in `"cat"`, index 0 is `c`.

## Index (database index)
A data structure that helps a database find rows quickly, like the index at the back of a book. SQL Level 7.

## Indentation
Spaces at the start of a line. Python uses indentation (4 spaces) to group lines into blocks.

## Input
Data given to a program - typed by a user (`input()`), read from a file, or received from a network.

## Integer (int)
A whole number: `-3`, `0`, `42`.

## Interpreter
The program that reads and executes Python code: `python` (or `py` on Windows).

## JOIN
SQL that combines rows from two or more tables using matching values. SQL Level 4.

## JSON (JavaScript Object Notation)
A text format for structured data, widely used by web APIs: `{"name": "Asha", "tags": ["a", "b"]}`.

## Keyword
A word reserved by a language: `if`, `for`, `def` in Python; `SELECT`, `WHERE` in SQL.

## Library / package / module
Re-usable code you can import. A **module** is one `.py` file; a **package** is a folder of modules; "library"
is the everyday word for either. Installed with `pip`.

## List
An ordered, changeable Python collection: `[3, 1, 2]`. Python Level 4.

## localhost
The name your computer uses for itself. `http://localhost:8501` means "the program on *this* computer, door
number 8501" - which is where this app runs. Nothing goes over the internet.

## Logic error
A mistake that gives wrong results without an error message.

## Loop
Code that repeats: `for` and `while` in Python.

## Method
A function that belongs to a value or object, called with a dot: `"hi".upper()`, `my_list.append(4)`.

## Module
A file of Python code that can be imported: `import math`.

## NULL / None
"No value / unknown". SQL calls it `NULL`; Python calls it `None`. It is not zero and not empty text.

## Object
In Python, every value is an object - it has a type, data and behaviour.

## Operator
A symbol that performs an operation: `+`, `-`, `*`, `/`, `==`, `and`...

## Output
What a program produces: text on screen, a file, a result table.

## Package manager (pip)
The tool that downloads and installs Python packages: `pip install streamlit`.

## Parameter
The name a function uses for a value it receives: in `def greet(name):`, `name` is a parameter.

## Path
The address of a file or folder: `C:\Users\Asha\notes.txt` or `/home/asha/notes.txt`.

## PATH (environment variable)
A list of folders where your computer looks for programs when you type a command. "Add Python to PATH"
makes the `python` command work in any terminal.

## Port
A numbered "door" on a computer through which programs talk over a network. This app uses port 8501.

## Primary key
A column (usually `id`) whose value uniquely identifies each row in a table.

## Program
A set of instructions a computer can run.

## Programming language
A formal language for writing programs, with strict rules: Python, SQL, JavaScript...

## Query
A question asked to a database, usually a `SELECT` statement.

## Record / row
One entry in a database table - for example one customer.

## Relational database
A database where data is split into tables linked by keys.

## Result set
The table of rows and columns returned by a query.

## Return value
The value a function gives back with `return`, which the caller can store or use.

## Runtime error
An error that happens while a program runs (an exception).

## Schema
The structure of a database: its tables, columns, types and relationships.

## Server
A program (or computer) that provides a service to other programs. When you start this app, a small server
runs on your computer and your browser talks to it.

## SQL (Structured Query Language)
The language used to work with relational databases.

## SQLite
A small database engine that stores a whole database in one file, built into Python. No server needed.

## Statement
One complete instruction: a line like `x = 5` in Python, or `SELECT ... ;` in SQL.

## String (str)
Text in a program, written in quotes: `"hello"`.

## Syntax
The grammar rules of a language. Breaking them causes a **SyntaxError**.

## Table
A set of rows that all share the same columns.

## Terminal / command prompt / shell
A window where you control the computer by typing commands (PowerShell, Command Prompt, Terminal).

## Traceback
Python's detailed error report, showing where an error happened and what it was. Read it from the bottom.

## Tuple
An ordered Python collection that cannot be changed after creation: `(3, 4)`. Python Level 4.

## Type conversion (casting)
Turning a value of one type into another: `int("5")`, `str(42)`, `float("2.5")`.

## Variable
A name that refers to a value: `score = 10`.

## Version control (Git)
A system that records the history of changes to files so you can see, compare and undo them. See the article
*Git basics*.

## Virtual environment (venv)
A private folder of Python packages for one project, so projects do not interfere with each other. This app
keeps its own in the `.venv` folder.
