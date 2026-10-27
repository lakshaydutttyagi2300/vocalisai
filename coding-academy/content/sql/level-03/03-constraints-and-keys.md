---
id: sql-3-3-constraints-and-keys
title: Constraints, keys and data integrity
track: sql
level: 3
order: 3
minutes: 45
summary: Make the database itself refuse bad data - primary keys, foreign keys, NOT NULL, UNIQUE, CHECK and DEFAULT - and decide what happens to related rows when something is deleted.
objectives:
  - Explain primary keys, foreign keys and composite keys
  - Add NOT NULL, UNIQUE, CHECK and DEFAULT constraints to a table
  - Predict which inserts a constraint will reject
  - Choose ON DELETE behaviour (restrict, cascade, set null) for a foreign key
prerequisites: [sql-3-2-create-alter-drop]
tags: [constraint, primary key, foreign key, references, not null, unique, check, default, composite key, on delete cascade, set null, integrity, relationship]
---

## Simple explanation

**Constraints** are rules attached to a table. The database checks them on every INSERT and UPDATE and
**refuses** data that breaks them - so mistakes are stopped at the door instead of being discovered months later.

```sql
CREATE TABLE members (
    id      INTEGER PRIMARY KEY,                 -- unique identifier for each row
    name    TEXT NOT NULL,                       -- must have a value
    email   TEXT NOT NULL UNIQUE,                -- no two members with the same email
    age     INTEGER CHECK (age >= 16),           -- custom rule
    joined  TEXT DEFAULT (date('now'))           -- filled in automatically
);
```

A **foreign key** links a row to a row in another table and guarantees that the link points to something that
exists:

```sql
CREATE TABLE loans (
    id        INTEGER PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members (id),
    book      TEXT NOT NULL
);
```

Now a loan for member 999 is rejected if there is no member 999.

## Real-world analogy

Constraints are the **validation on a paper form**: "Name: required", "Email: one account per address", "Age:
16 or over". A foreign key is a **cloakroom ticket**: a ticket must correspond to a real coat hook, and you can't
remove a hook while tickets for it are still in circulation (unless you decide the coats go with it - cascade).

## Technical definition

- **PRIMARY KEY**: uniquely identifies each row; implies UNIQUE (and in most databases NOT NULL). A
  **composite** primary key uses several columns: `PRIMARY KEY (student_id, course_id)`.
- **FOREIGN KEY**: `col INTEGER REFERENCES other_table (id)` or a table-level `FOREIGN KEY (col) REFERENCES
  other (id)`. The referenced column must be a primary key or UNIQUE.
- **ON DELETE** action for the referenced row: `RESTRICT`/`NO ACTION` (default - refuse while children exist),
  `CASCADE` (delete the children too), `SET NULL` (keep children, clear the link). Similar `ON UPDATE`.
- **NOT NULL**, **UNIQUE** (NULLs are allowed and don't clash with each other), **CHECK (condition)** (row is
  rejected when the condition is false), **DEFAULT value** (used when the column is left out).
- **SQLite specifics**: foreign keys are only enforced when `PRAGMA foreign_keys = ON` is set for the connection
  (this app turns it on for you); other databases always enforce them. `INSERT OR IGNORE` / `INSERT OR REPLACE`
  choose what to do on a conflict (PostgreSQL: `ON CONFLICT DO NOTHING`; MySQL: `INSERT IGNORE`).
- Constraints can be **named** (`CONSTRAINT positive_price CHECK (price > 0)`) so error messages are clearer.
- Inspect: `pragma_table_info('t')` (NOT NULL, PK), `pragma_foreign_key_list('t')`, `pragma_index_list('t')`
  (UNIQUE creates an index).

## Step-by-step examples

**Example 1 - watching a constraint work** (Blank database)

```sql
CREATE TABLE products (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    price REAL NOT NULL CHECK (price > 0)
);
INSERT INTO products (name, price) VALUES ('Pen', 1.5);    -- ok
INSERT INTO products (name, price) VALUES ('Pen', 2.0);    -- error: UNIQUE constraint failed: products.name
```

**Example 2 - INSERT OR IGNORE skips rows that break a rule**

```sql
INSERT OR IGNORE INTO products (name, price) VALUES ('Ruler', -3);   -- skipped (CHECK)
SELECT * FROM products;                                              -- only the Pen
```

**Example 3 - a junction table with a composite key**

```sql
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE clubs    (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE memberships (
    student_id INTEGER NOT NULL REFERENCES students (id),
    club_id    INTEGER NOT NULL REFERENCES clubs (id),
    PRIMARY KEY (student_id, club_id)          -- a student joins a club only once
);
```

**Example 4 - ON DELETE CASCADE**

```sql
CREATE TABLE orders (id INTEGER PRIMARY KEY);
CREATE TABLE order_lines (
    id       INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE
);
DELETE FROM orders WHERE id = 1;   -- its order_lines disappear too
```

## Common mistakes

- **Relying on the application alone** to validate data - other programs, imports and manual fixes bypass it.
  Put essential rules in the database too.
- **CASCADE everywhere** - deleting one customer silently wipes years of orders. Use it only for true "part-of"
  relationships (order lines of an order).
- **Forgetting `PRAGMA foreign_keys = ON`** in your own SQLite programs - foreign keys are then not checked.
- **UNIQUE on a column that can legitimately repeat** (e.g. last_name).
- **CHECK conditions that allow NULL by accident** - `CHECK (age >= 16)` passes when age is NULL; add NOT NULL
  if the value is required.
- **Foreign key column type different** from the referenced key (TEXT vs INTEGER).

## Practical application

Good constraints make data trustworthy: no orders for customers who don't exist, no negative stock, no duplicate
accounts. When you design the database for your own project (Level 7 and the projects), start with keys and
NOT NULL, add UNIQUE for natural identifiers (emails, SKUs) and CHECK for simple business rules.

## Revision notes

- PRIMARY KEY (unique row id; composite for junction tables), FOREIGN KEY ... REFERENCES (valid links).
- NOT NULL, UNIQUE, CHECK (condition), DEFAULT value.
- ON DELETE: RESTRICT (default) / CASCADE / SET NULL.
- SQLite: foreign keys need `PRAGMA foreign_keys = ON`; `INSERT OR IGNORE` skips violating rows.
- CHECK passes on NULL - combine with NOT NULL when required.

```exercise
id: members-unique-email
title: NOT NULL and UNIQUE
difficulty: beginner
dataset: blank
instructions: |
  Create a table **members** with columns `id` (INTEGER PRIMARY KEY), `name` (TEXT, **required**) and `email`
  (TEXT, **required** and **unique**).

  The check then tries to insert some good and bad members with `INSERT OR IGNORE` and looks at what was
  accepted - only rows that obey your rules should get in.
starter: |
  CREATE TABLE members (
      id    INTEGER PRIMARY KEY,
      name  TEXT,
      email TEXT
  );
hints:
  - "Required = `NOT NULL`. Unique = `UNIQUE`."
  - "A column can have both: `email TEXT NOT NULL UNIQUE`."
solution: |
  CREATE TABLE members (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
  );
explanation: |
  The duplicate email, the missing name and the missing email were all rejected by the database itself. Only the
  two valid members were stored.
check:
  verify: |
    INSERT OR IGNORE INTO members (name, email) VALUES ('Asha', 'asha@example.com');
    INSERT OR IGNORE INTO members (name, email) VALUES ('Asha Again', 'asha@example.com');
    INSERT OR IGNORE INTO members (name, email) VALUES (NULL, 'nobody@example.com');
    INSERT OR IGNORE INTO members (name, email) VALUES ('Ben', NULL);
    INSERT OR IGNORE INTO members (name, email) VALUES ('Cy', 'cy@example.com');
    SELECT name, email FROM members ORDER BY id;
```

```exercise
id: accounts-check
title: CHECK and DEFAULT
difficulty: beginner
dataset: blank
instructions: |
  Create a table **accounts** with:

  - `id` INTEGER PRIMARY KEY
  - `owner` TEXT, required
  - `balance` REAL, required, **default 0**, and a **CHECK** that it is never negative

  The check inserts a normal account, an account with a negative balance (must be rejected) and an account with
  no balance given (must get 0).
starter: |
  CREATE TABLE accounts (
      id      INTEGER PRIMARY KEY,
      owner   TEXT NOT NULL,
      balance REAL
  );
hints:
  - "Several rules can follow one column: `balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0)`."
solution: |
  CREATE TABLE accounts (
      id      INTEGER PRIMARY KEY,
      owner   TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0)
  );
explanation: |
  The CHECK rejected the negative balance; the DEFAULT gave the third account 0. Because balance is also NOT
  NULL, nobody can store an "unknown" balance by writing NULL.
check:
  verify: |
    INSERT OR IGNORE INTO accounts (owner, balance) VALUES ('Asha', 50);
    INSERT OR IGNORE INTO accounts (owner, balance) VALUES ('Ben', -10);
    INSERT OR IGNORE INTO accounts (owner) VALUES ('Cy');
    INSERT OR IGNORE INTO accounts (owner, balance) VALUES ('Dee', NULL);
    SELECT owner, balance FROM accounts ORDER BY id;
```

```exercise
id: composite-key
title: A junction table with a composite key
difficulty: intermediate
dataset: blank
instructions: |
  Users can "like" posts, but each user may like a given post only **once**. Create a table **likes** with
  columns `user_id` (INTEGER, required), `post_id` (INTEGER, required) and `liked_on` (TEXT), whose **primary key
  is the pair** `(user_id, post_id)`.

  The check inserts some likes - including a repeated one - and counts what was accepted.
starter: |
  CREATE TABLE likes (
      user_id  INTEGER,
      post_id  INTEGER,
      liked_on TEXT
  );
hints:
  - "A table-level primary key goes after the columns: `PRIMARY KEY (user_id, post_id)`."
  - "Remember the comma after the `liked_on TEXT` line once you add another line after it."
solution: |
  CREATE TABLE likes (
      user_id  INTEGER NOT NULL,
      post_id  INTEGER NOT NULL,
      liked_on TEXT,
      PRIMARY KEY (user_id, post_id)
  );
explanation: |
  The pair must be unique, not each column on its own: user 1 can like posts 10 and 11, and post 10 can be liked by
  users 1 and 2, but user 1 can't like post 10 twice.
check:
  verify: |
    INSERT OR IGNORE INTO likes VALUES (1, 10, '2026-05-01');
    INSERT OR IGNORE INTO likes VALUES (1, 11, '2026-05-01');
    INSERT OR IGNORE INTO likes VALUES (2, 10, '2026-05-02');
    INSERT OR IGNORE INTO likes VALUES (1, 10, '2026-05-03');
    INSERT OR IGNORE INTO likes VALUES (NULL, 12, '2026-05-03');
    SELECT user_id, post_id, liked_on,
           (SELECT GROUP_CONCAT(name) FROM pragma_table_info('likes') WHERE pk > 0) AS key_columns
    FROM likes
    ORDER BY user_id, post_id;
```

```exercise
id: cascade-delete
title: Foreign keys with ON DELETE CASCADE
difficulty: challenge
dataset: blank
instructions: |
  1. Create **playlists** (`id` INTEGER PRIMARY KEY, `name` TEXT NOT NULL) and **songs** (`id` INTEGER PRIMARY
     KEY, `title` TEXT NOT NULL, `playlist_id` INTEGER NOT NULL that **references playlists(id)** and deletes the
     songs automatically when their playlist is deleted).
  2. Insert playlists **Road trip** (id 1) and **Focus** (id 2), and songs **Highway Song** and **Open Road** in
     Road trip, and **Deep Work** in Focus.
  3. Delete the **Road trip** playlist.
starter: |
  -- 1. CREATE TABLE playlists ... and CREATE TABLE songs ...

  -- 2. INSERT ...

  -- 3. DELETE ...
hints:
  - "`playlist_id INTEGER NOT NULL REFERENCES playlists (id) ON DELETE CASCADE`"
  - "Insert playlists first (the songs need them to exist): `INSERT INTO playlists (id, name) VALUES (1, 'Road trip'), (2, 'Focus');`"
  - "`DELETE FROM playlists WHERE name = 'Road trip';` - the cascade removes its two songs."
solution: |
  CREATE TABLE playlists (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL
  );
  CREATE TABLE songs (
      id          INTEGER PRIMARY KEY,
      title       TEXT NOT NULL,
      playlist_id INTEGER NOT NULL REFERENCES playlists (id) ON DELETE CASCADE
  );
  INSERT INTO playlists (id, name) VALUES (1, 'Road trip'), (2, 'Focus');
  INSERT INTO songs (title, playlist_id) VALUES ('Highway Song', 1), ('Open Road', 1), ('Deep Work', 2);
  DELETE FROM playlists WHERE name = 'Road trip';
explanation: |
  Without `ON DELETE CASCADE`, the DELETE would fail with "FOREIGN KEY constraint failed" because songs still
  point at playlist 1. With it, the playlist's songs are removed together with it. Cascade suits "part-of" data
  like this; for important records (customers and their orders) the default refusal is safer.
check:
  verify: |
    SELECT (SELECT COUNT(*) FROM playlists) AS playlists,
           (SELECT GROUP_CONCAT(title) FROM songs) AS songs_left,
           (SELECT "table" || '.' || "to" || ' ' || on_delete FROM pragma_foreign_key_list('songs')) AS foreign_key;
```

```quiz
- id: q1
  question: What does a PRIMARY KEY guarantee?
  options:
    - Each row can be uniquely identified by it
    - The column is sorted
    - The column is a number
    - The table can't be deleted
  answer: Each row can be uniquely identified by it
  explanation: No two rows may have the same primary key value.
- id: q2
  question: "loans.member_id REFERENCES members(id). What happens if you insert a loan for member 999, which doesn't exist (foreign keys on)?"
  options:
    - The insert is rejected with a foreign key error
    - Member 999 is created automatically
    - The loan is stored with member_id NULL
    - It works - foreign keys are only documentation
  answer: The insert is rejected with a foreign key error
  explanation: Foreign keys guarantee links point to existing rows.
- id: q3
  question: Does `CHECK (age >= 16)` reject a row where age is NULL?
  options:
    - No - the check is not false for NULL, so the row is accepted; add NOT NULL to require a value
    - Yes, always
    - Only on Mondays
    - Only in PostgreSQL
  answer: No - the check is not false for NULL, so the row is accepted; add NOT NULL to require a value
  explanation: A CHECK only rejects rows where the condition is definitely false.
- id: q4
  question: Which ON DELETE action removes the child rows when the parent row is deleted?
  options:
    - CASCADE
    - RESTRICT
    - SET NULL
    - NO ACTION
  answer: CASCADE
  explanation: RESTRICT/NO ACTION refuse the delete; SET NULL keeps children but clears the link.
- id: q5
  question: Why would a junction table use `PRIMARY KEY (student_id, club_id)`?
  options:
    - So the same student can't join the same club twice, while still joining many clubs
    - So each student can only join one club
    - So clubs can only have one student
    - To make the table faster to delete
  answer: So the same student can't join the same club twice, while still joining many clubs
  explanation: The pair must be unique, not each column alone.
- id: q6
  question: In SQLite, what must be switched on for foreign keys to be enforced?
  options:
    - PRAGMA foreign_keys = ON for the connection
    - Nothing - they are always enforced
    - The STRICT keyword on every table
    - A UNIQUE index on every column
  answer: PRAGMA foreign_keys = ON for the connection
  explanation: This app turns it on; in your own programs, run it after connecting.
```
