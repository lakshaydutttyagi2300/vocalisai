---
id: proj-sql-10-library-database
title: Design and build a library database (complete project)
track: sql
order: 10
difficulty: challenge
summary: Design a small lending-library database from scratch - tables, keys, constraints, sample data, everyday queries, a view, indexes and a transaction - in the Blank database.
dataset: blank
internet: false
skills: [sql-7-1-design-and-normalisation, sql-3-3-constraints-and-keys, sql-3-1-insert-update-delete, sql-4-2-left-join-and-nulls, sql-7-2-indexes-and-query-plans, sql-7-3-transactions-and-acid]
stages:
  - name: Beginner
    description: Design and create.
    tasks:
      - {id: b1, text: "Sketch the entities: members, books (titles), copies, loans - and their relationships"}
      - {id: b2, text: "CREATE the tables with primary keys, foreign keys, NOT NULL, UNIQUE and CHECK constraints"}
      - {id: b3, text: "INSERT sample data: at least 4 members, 5 books, 8 copies and 6 loans (some returned, some not)"}
  - name: Intermediate
    description: Make it useful.
    tasks:
      - {id: i1, text: "Query: books currently on loan, who has them and when they're due"}
      - {id: i2, text: "Query: overdue loans as of a given date, with days overdue"}
      - {id: i3, text: "Query: available copies per book (copies minus copies on loan), including books with none available"}
      - {id: i4, text: "A view current_loans and an index on the column(s) your queries filter on most"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Lend a book in a transaction that refuses to lend a copy that's already out"}
      - {id: e2, text: "Authors as a separate table with a many-to-many link to books"}
      - {id: e3, text: "Fines: 0.20 per day overdue, total per member"}
      - {id: e4, text: "Use the database from Python (see the Contacts app project) to build a small library app"}
---

## Goal

Everything from Level 7 in one project: turn a description into a design, build it with constraints that protect
the data, fill it, and write the queries the library staff need every day.

## The description

> The library lends books to members. A **book** (title, author, ISBN, year) can have several physical **copies**
> (each with a barcode). **Members** have a name, a unique email and a join date. A **loan** records which copy was
> lent to which member, when, the due date (14 days later) and the return date (empty until returned). A copy can
> only be on one open loan at a time.

## Hints

- Separate `books` (the title) from `copies` (the physical items): many copies per book.
- `loans.returned_on IS NULL` means the copy is still out.
- CHECK ideas: `due_on > loaned_on`, `returned_on IS NULL OR returned_on >= loaned_on`.
- "Only one open loan per copy": a **partial unique index** -
  `CREATE UNIQUE INDEX one_open_loan ON loans (copy_id) WHERE returned_on IS NULL;`
- Use a fixed "today" (e.g. `'2026-06-30'`) in queries so results don't change from day to day.

## Sample solution

```sql
-- Design and constraints
CREATE TABLE members (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL UNIQUE,
    joined_on TEXT NOT NULL
);
CREATE TABLE books (
    id     INTEGER PRIMARY KEY,
    title  TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn   TEXT UNIQUE,
    year   INTEGER CHECK (year BETWEEN 1450 AND 2100)
);
CREATE TABLE copies (
    id      INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books (id),
    barcode TEXT NOT NULL UNIQUE
);
CREATE TABLE loans (
    id          INTEGER PRIMARY KEY,
    copy_id     INTEGER NOT NULL REFERENCES copies (id),
    member_id   INTEGER NOT NULL REFERENCES members (id),
    loaned_on   TEXT NOT NULL,
    due_on      TEXT NOT NULL,
    returned_on TEXT,
    CHECK (due_on > loaned_on),
    CHECK (returned_on IS NULL OR returned_on >= loaned_on)
);
CREATE UNIQUE INDEX one_open_loan ON loans (copy_id) WHERE returned_on IS NULL;
CREATE INDEX idx_loans_member ON loans (member_id);
```

```sql
-- Sample data
INSERT INTO members (id, name, email, joined_on) VALUES
  (1, 'Asha Rao', 'asha@example.com', '2025-01-10'),
  (2, 'Ben Ode', 'ben@example.com', '2025-03-02'),
  (3, 'Chen Li', 'chen@example.com', '2025-09-15'),
  (4, 'Dana Fox', 'dana@example.com', '2026-02-01');
INSERT INTO books (id, title, author, isbn, year) VALUES
  (1, 'Python Crash Course', 'Eric Matthes', '9781718502703', 2023),
  (2, 'SQL Pocket Guide', 'Alice Zhao', '9781492090403', 2021),
  (3, 'Emma', 'Jane Austen', '9780141439587', 1815),
  (4, 'Dune', 'Frank Herbert', '9780441172719', 1965),
  (5, 'The Data Detective', 'Tim Harford', '9780593084595', 2021);
INSERT INTO copies (id, book_id, barcode) VALUES
  (1, 1, 'C-0001'), (2, 1, 'C-0002'), (3, 2, 'C-0003'), (4, 3, 'C-0004'),
  (5, 4, 'C-0005'), (6, 4, 'C-0006'), (7, 4, 'C-0007'), (8, 5, 'C-0008');
INSERT INTO loans (copy_id, member_id, loaned_on, due_on, returned_on) VALUES
  (1, 1, '2026-05-01', '2026-05-15', '2026-05-12'),
  (1, 2, '2026-06-20', '2026-07-04', NULL),
  (3, 1, '2026-06-01', '2026-06-15', NULL),
  (5, 3, '2026-06-10', '2026-06-24', NULL),
  (6, 4, '2026-06-25', '2026-07-09', NULL),
  (4, 2, '2026-04-01', '2026-04-15', '2026-04-20');
```

```sql
-- On loan now, overdue as of 2026-06-30
CREATE VIEW current_loans AS
SELECT l.id AS loan_id, b.title, c.barcode, m.name AS member, l.loaned_on, l.due_on
FROM loans AS l
JOIN copies AS c ON c.id = l.copy_id
JOIN books AS b ON b.id = c.book_id
JOIN members AS m ON m.id = l.member_id
WHERE l.returned_on IS NULL;

SELECT * FROM current_loans ORDER BY due_on;

SELECT title, member, due_on,
       CAST(julianday('2026-06-30') - julianday(due_on) AS INTEGER) AS days_overdue
FROM current_loans
WHERE due_on < '2026-06-30'
ORDER BY days_overdue DESC;
```

```sql
-- Available copies per book
SELECT b.title,
       COUNT(c.id) AS copies,
       COUNT(c.id) - COUNT(open_loans.copy_id) AS available
FROM books AS b
LEFT JOIN copies AS c ON c.book_id = b.id
LEFT JOIN (SELECT copy_id FROM loans WHERE returned_on IS NULL) AS open_loans ON open_loans.copy_id = c.id
GROUP BY b.id, b.title
ORDER BY available, b.title;
```

```sql
-- Lending safely in a transaction: copy 3 is already out, so the unique index refuses a second open loan.
-- (Run this on its own in the SQL Lab to see the error; nothing is saved because the transaction never commits.)
-- BEGIN;
-- INSERT INTO loans (copy_id, member_id, loaned_on, due_on) VALUES (3, 4, '2026-06-30', '2026-07-14');
-- COMMIT;
BEGIN;
INSERT INTO loans (copy_id, member_id, loaned_on, due_on) VALUES (8, 4, '2026-06-30', '2026-07-14');
COMMIT;
SELECT * FROM current_loans ORDER BY loan_id;
```

## Check your work

Try to break your own rules: a second open loan for the same copy, a loan for member 99, a due date before the
loan date, a duplicate email. Every attempt should be refused by the database. Then draw your design (boxes and
lines on paper is fine) and compare it with the Level 7 normalisation rules.
