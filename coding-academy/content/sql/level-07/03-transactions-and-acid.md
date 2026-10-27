---
id: sql-7-3-transactions-and-acid
title: Transactions and ACID
track: sql
level: 7
order: 3
minutes: 40
summary: Group several changes into one all-or-nothing unit with BEGIN, COMMIT and ROLLBACK, use savepoints, and understand the ACID guarantees, isolation and locking in SQLite and other databases.
objectives:
  - Group related changes in a transaction with BEGIN and COMMIT
  - Undo uncommitted changes with ROLLBACK
  - Use SAVEPOINT and ROLLBACK TO for partial undo
  - Explain atomicity, consistency, isolation and durability in plain words
  - Describe how concurrent users affect each other (locking, isolation levels)
prerequisites: [sql-3-1-insert-update-delete]
tags: [transaction, begin, commit, rollback, savepoint, rollback to, acid, atomicity, consistency, isolation, durability, locking, concurrency, isolation level, autocommit]
---

## Simple explanation

Some changes only make sense **together**. Moving £100 between accounts is two updates: take £100 from one,
add £100 to the other. If the program crashed between them, money would vanish. A **transaction** makes them
one all-or-nothing unit:

```sql
-- try it in the Blank database:
CREATE TABLE accounts (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL);
INSERT INTO accounts VALUES (1, 'Asha', 500), (2, 'Ben', 50);

BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;            -- make both changes permanent

SELECT * FROM accounts;
```

Changed your mind before COMMIT? `ROLLBACK;` throws away everything since BEGIN.

Outside an explicit transaction, each statement is its own tiny transaction ("autocommit").

> In this app's SQL Lab, each Run uses a fresh connection: if you BEGIN but don't COMMIT, your changes are
> discarded when the run finishes - just like a real database does when a program disconnects mid-transaction.

## Real-world analogy

A transaction is a **shopping trip with a basket**: you collect items (changes), and only at the **till**
(COMMIT) does anything actually become yours. You can put everything back on the shelves (ROLLBACK) at any point
before paying. A **savepoint** is a note in your basket: "everything after this point, put back if I change my
mind".

## Technical definition

- `BEGIN [TRANSACTION];` ... `COMMIT;` or `ROLLBACK;` (`START TRANSACTION` in MySQL/PostgreSQL also works).
- `SAVEPOINT name;` ... `ROLLBACK TO name;` (undo back to the savepoint, transaction stays open) ...
  `RELEASE name;` (keep the changes, forget the savepoint).
- **ACID**:
  - **Atomicity** - all of the transaction happens, or none of it.
  - **Consistency** - constraints (keys, CHECKs) hold before and after; a violating change is rejected.
  - **Isolation** - concurrent transactions don't see each other's half-finished work.
  - **Durability** - once COMMIT returns, the change survives crashes and power cuts.
- **Concurrency**: SQLite allows many readers but **one writer at a time** (the whole database is locked for
  writing; other writers wait or get "database is locked"). PostgreSQL, MySQL and SQL Server lock individual
  rows and offer **isolation levels** (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) that trade consistency for
  concurrency - higher levels prevent anomalies such as non-repeatable reads and phantom rows.
- **Deadlock**: two transactions each wait for a lock the other holds; the database aborts one. Keep
  transactions short and touch tables in the same order.
- In application code (e.g. Python's `sqlite3`), errors inside a transaction should lead to `rollback()`; the
  connection's context manager (`with conn:`) commits on success and rolls back on exceptions.

## Step-by-step examples

**Example 1 - all or nothing** (Shop)

```sql
BEGIN;
INSERT INTO orders (id, customer_id, order_date, status, shipping_city)
VALUES (1001, 7, '2026-07-01', 'pending', 'Paris');
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (1001, 4, 2, 15.6);
UPDATE products SET stock = stock - 2 WHERE id = 4;
COMMIT;
```

**Example 2 - rolling back a mistake** (School)

```sql
BEGIN;
UPDATE enrollments SET score = 0;        -- oops: no WHERE!
SELECT COUNT(*) FROM enrollments WHERE score = 0;    -- every row... 
ROLLBACK;                                 -- phew - nothing changed
SELECT COUNT(*) FROM enrollments WHERE score = 0;    -- back to normal
```

**Example 3 - a savepoint**

```sql
BEGIN;
UPDATE products SET price = ROUND(price * 1.05, 2) WHERE category_id = 1;
SAVEPOINT before_toys;
UPDATE products SET price = price * 10 WHERE category_id = 5;     -- typo: meant 1.10
ROLLBACK TO before_toys;                  -- undo only the toys change
UPDATE products SET price = ROUND(price * 1.10, 2) WHERE category_id = 5;
COMMIT;                                   -- books +5% and toys +10% are saved
```

## Common mistakes

- **Forgetting COMMIT** in your own programs - the changes vanish when the connection closes, or locks are held
  and block other users.
- **Long transactions** (e.g. waiting for user input in the middle) - other writers are blocked.
- **Assuming ROLLBACK works after COMMIT** - it doesn't; committed data needs a backup or a corrective change.
- **Doing related changes outside a transaction** - a failure halfway leaves inconsistent data.
- **Ignoring "database is locked" errors** in SQLite - retry after a short wait, and keep write transactions short.

## Practical application

Every money movement, every order placement (order + items + stock), every import of a batch of rows should be a
transaction: either the whole thing is applied or nothing is. Wrapping risky manual fixes in BEGIN ... check with
SELECT ... COMMIT/ROLLBACK is a professional habit that has saved many databases.

## Revision notes

- `BEGIN; ...; COMMIT;` = all-or-nothing; `ROLLBACK;` undoes uncommitted changes.
- `SAVEPOINT x; ... ROLLBACK TO x;` = partial undo inside a transaction.
- ACID: Atomic, Consistent, Isolated, Durable.
- SQLite: one writer at a time; server databases lock rows and offer isolation levels.
- Keep transactions short; always end them with COMMIT or ROLLBACK.

```exercise
id: place-order
title: Place an order in one transaction
difficulty: beginner
dataset: shop
instructions: |
  Customer **7** orders **3 × product 23** (Puzzle 1000 pcs) at its current price **13.06**. In **one
  transaction**:

  1. insert order **1001** for customer 7, dated **2026-07-01**, status **pending**, shipping city **Paris**;
  2. insert the order item (order 1001, product 23, quantity 3, unit_price 13.06);
  3. reduce product 23's `stock` by 3;

  then commit.
starter: |
  -- BEGIN, three changes, COMMIT
hints:
  - "Start with `BEGIN;` and end with `COMMIT;`."
  - "`INSERT INTO orders (id, customer_id, order_date, status, shipping_city) VALUES (1001, 7, '2026-07-01', 'pending', 'Paris');`"
  - "`INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (1001, 23, 3, 13.06);` and `UPDATE products SET stock = stock - 3 WHERE id = 23;`"
solution: |
  BEGIN;
  INSERT INTO orders (id, customer_id, order_date, status, shipping_city)
  VALUES (1001, 7, '2026-07-01', 'pending', 'Paris');
  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (1001, 23, 3, 13.06);
  UPDATE products SET stock = stock - 3 WHERE id = 23;
  COMMIT;
explanation: |
  The three changes belong together: an order without items, or items without the stock being reduced, would
  leave the database inconsistent. Inside one transaction, either all three are saved or none.
check:
  require_text: [BEGIN, COMMIT]
  verify: |
    SELECT o.id, o.customer_id, o.order_date, o.status, o.shipping_city,
           i.product_id, i.quantity, i.unit_price,
           (SELECT stock FROM products WHERE id = 23) AS stock_left
    FROM orders AS o
    JOIN order_items AS i ON i.order_id = o.id
    WHERE o.id = 1001;
```

```exercise
id: rollback-mistake
title: Roll back a mistake
difficulty: intermediate
dataset: school
instructions: |
  Practise the safety net:

  1. `BEGIN;` then run the **mistaken** update `UPDATE enrollments SET grade = 'A';` (it forgets the WHERE and
     gives everyone an A), look at the damage with a SELECT if you like, and **ROLLBACK**.
  2. Then do the **intended** change in a new transaction and commit it: add 5 points to the **Statistics**
     course (course_id **4**) scores in term **2025-autumn**, but never above 100 (use `MIN(score + 5, 100)`).
starter: |
  BEGIN;
  UPDATE enrollments SET grade = 'A';
  COMMIT;
hints:
  - "The starter commits the mistake! Replace that COMMIT with ROLLBACK."
  - "Then: `BEGIN; UPDATE enrollments SET score = MIN(score + 5, 100) WHERE course_id = 4 AND term = '2025-autumn'; COMMIT;`"
  - "In SQLite, MIN with two arguments returns the smaller one."
solution: |
  BEGIN;
  UPDATE enrollments SET grade = 'A';
  ROLLBACK;

  BEGIN;
  UPDATE enrollments
  SET score = MIN(score + 5, 100)
  WHERE course_id = 4 AND term = '2025-autumn';
  COMMIT;
explanation: |
  ROLLBACK threw away the update that touched every row, as if it never happened. Only the second, correct change
  was committed. With real data, this BEGIN → check → COMMIT/ROLLBACK routine is the safest way to make manual
  fixes.
check:
  require_text: [BEGIN, ROLLBACK, COMMIT]
  verify: |
    SELECT course_id, term, SUM(score) AS total_score, MAX(score) AS best,
           SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) AS a_grades
    FROM enrollments
    GROUP BY course_id, term
    ORDER BY course_id, term;
```

```exercise
id: savepoint-fix
title: Undo part of a transaction with a savepoint
difficulty: challenge
dataset: shop
instructions: |
  In **one** transaction:

  1. raise all **Books** prices (category 1) by 5% (rounded to 2 decimals);
  2. create a savepoint named **before_toys**;
  3. run the faulty update `UPDATE products SET price = price * 10 WHERE category_id = 5;`
  4. undo **only** step 3 with `ROLLBACK TO before_toys`;
  5. raise **Toys** prices (category 5) by 10% (rounded to 2 decimals);
  6. commit.
starter: |
  BEGIN;
  UPDATE products SET price = ROUND(price * 1.05, 2) WHERE category_id = 1;
  UPDATE products SET price = price * 10 WHERE category_id = 5;
  COMMIT;
hints:
  - "`SAVEPOINT before_toys;` goes between the books update and the faulty update."
  - "`ROLLBACK TO before_toys;` undoes everything after the savepoint but keeps the transaction (and the books change) open."
  - "Then `UPDATE products SET price = ROUND(price * 1.10, 2) WHERE category_id = 5;` and `COMMIT;`."
solution: |
  BEGIN;
  UPDATE products SET price = ROUND(price * 1.05, 2) WHERE category_id = 1;
  SAVEPOINT before_toys;
  UPDATE products SET price = price * 10 WHERE category_id = 5;
  ROLLBACK TO before_toys;
  UPDATE products SET price = ROUND(price * 1.10, 2) WHERE category_id = 5;
  COMMIT;
explanation: |
  A plain ROLLBACK would also have undone the books change. ROLLBACK TO a savepoint undoes only the work done after
  it, so you can recover from one mistake without starting the whole transaction again.
check:
  require_text: [SAVEPOINT, ROLLBACK TO]
  verify: SELECT id, price FROM products WHERE category_id IN (1, 5) ORDER BY id;
```

```quiz
- id: q1
  question: What does ROLLBACK do?
  options:
    - Undoes all changes made since BEGIN that haven't been committed
    - Undoes the last committed transaction
    - Restores the database from a backup
    - Deletes the table
  answer: Undoes all changes made since BEGIN that haven't been committed
  explanation: Committed changes can't be rolled back.
- id: q2
  question: What does the A in ACID stand for?
  options:
    - Atomicity - all of the transaction happens or none of it
    - Availability
    - Accuracy
    - Authentication
  answer: Atomicity - all of the transaction happens or none of it
  explanation: Consistency, Isolation and Durability complete ACID.
- id: q3
  question: Why put an order, its items and the stock update in one transaction?
  options:
    - So a failure halfway can't leave an order without items or stock unchanged
    - To make the order cheaper
    - Because INSERT requires a transaction
    - So the order is hidden from other users forever
  answer: So a failure halfway can't leave an order without items or stock unchanged
  explanation: Related changes should succeed or fail together.
- id: q4
  question: What does ROLLBACK TO my_savepoint do?
  options:
    - Undoes changes made after the savepoint; the transaction stays open
    - Ends the transaction and undoes everything
    - Commits everything before the savepoint and ends the transaction
    - Deletes the savepoint only
  answer: Undoes changes made after the savepoint; the transaction stays open
  explanation: You still need COMMIT (or ROLLBACK) to finish.
- id: q5
  question: How many transactions can write to an SQLite database at the same moment?
  options:
    - One
    - Unlimited
    - One per table
    - One per row
  answer: One
  explanation: Many can read, one can write. Server databases lock at the row level.
- id: q6
  question: What does Durability guarantee?
  options:
    - Once committed, changes survive crashes and power cuts
    - Data never changes
    - Queries are fast
    - Transactions never fail
  answer: Once committed, changes survive crashes and power cuts
  explanation: The database writes committed changes safely to disk.
```
