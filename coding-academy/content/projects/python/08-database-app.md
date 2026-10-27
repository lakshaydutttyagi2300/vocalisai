---
id: proj-py-08-database-app
title: Contacts app with SQLite
track: python
order: 8
difficulty: intermediate
summary: A contacts manager that stores data in an SQLite database file using Python's sqlite3 module - create, search, update and delete, with parameterised queries and transactions.
internet: false
skills: [sql-3-1-insert-update-delete, sql-3-3-constraints-and-keys, py-10-5-security-and-maintainable-code, py-7-3-exceptions, py-11-4-advanced-exceptions-context-managers, py-6-3-problem-decomposition]
demo_input: |
  add
  Asha Rao
  asha@example.com
  07700 900123
  add
  Ben Ode
  asha@example.com

  add
  Ben Ode
  ben@example.com

  add

  nobody@example.com

  list
  find
  rao
  delete
  2
  list
  quit
starter: |
  import sqlite3

  conn = sqlite3.connect("contacts.db")
  conn.execute("""CREATE TABLE IF NOT EXISTS contacts (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT
  )""")

  # your code here: add a contact and list all contacts
stages:
  - name: Beginner
    description: Store and show.
    tasks:
      - {id: b1, text: "The program creates the contacts table if it doesn't exist (in contacts.db)"}
      - {id: b2, text: "add asks for name, email and phone and INSERTs them with ? placeholders"}
      - {id: b3, text: "list shows all contacts sorted by name"}
  - name: Intermediate
    description: A complete, safe app.
    tasks:
      - {id: i1, text: "find searches names and emails case-insensitively with LIKE and a placeholder"}
      - {id: i2, text: "delete removes a contact by id and says if no contact had that id"}
      - {id: i3, text: "A duplicate email is caught (sqlite3.IntegrityError) and explained"}
      - {id: i4, text: "Changes are committed with 'with conn:' so failures roll back"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "edit changes one field of a contact"}
      - {id: e2, text: "A second table of groups (family, work) with a junction table"}
      - {id: e3, text: "Export all contacts to CSV, import from CSV"}
      - {id: e4, text: "Write tests that use an in-memory database (':memory:')"}
---

## Goal

Connect the two halves of this academy: Python programs and SQL databases. Most real applications store their
data like this. You'll also practise the single most important database security habit: **placeholders**.

## Example run

```text
Command (add/list/find/delete/quit): add
Name: Asha Rao
Email: asha@example.com
Phone: 07700 900123
Added contact 1.
Command (add/list/find/delete/quit): add
Name: Ben Ode
Email: asha@example.com
Phone:
That email is already used by another contact.
...
Command (add/list/find/delete/quit): list
  1  Asha Rao       asha@example.com      07700 900123
  2  Ben Ode        ben@example.com
```

## Step-by-step plan

1. Connect and create the table (with `NOT NULL` and `UNIQUE` rules).
2. Write one function per action: `add_contact(conn, name, email, phone)`, `list_contacts(conn)`,
   `find(conn, text)`, `delete(conn, contact_id)` - each runs one parameterised SQL statement.
3. Wrap changes in `with conn:` (commits on success, rolls back on error).
4. A menu loop reads commands and calls the functions; catch `sqlite3.IntegrityError` for duplicates.

## Hints

- Placeholders: `conn.execute("INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)", (name, email, phone))`
  - never f-strings with user text.
- Empty input → store NULL: `email or None`.
- `cursor.lastrowid` gives the new id; `cursor.rowcount` tells you how many rows a DELETE removed.
- Case-insensitive search: `WHERE name LIKE ? OR email LIKE ?` with `f"%{text}%"` as the value (SQLite's LIKE is
  case-insensitive for English letters).
- Open the `contacts.db` file in the Python Lab's practice folder to see that it persists.

## Sample solution

```python
import sqlite3
from pathlib import Path

DB = Path("contacts.db")


def connect(path=DB):
    conn = sqlite3.connect(path)
    conn.execute("""CREATE TABLE IF NOT EXISTS contacts (
        id    INTEGER PRIMARY KEY,
        name  TEXT NOT NULL CHECK (length(trim(name)) > 0),
        email TEXT UNIQUE,
        phone TEXT
    )""")
    return conn


def add_contact(conn, name, email, phone):
    with conn:
        cursor = conn.execute("INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)",
                              (name.strip(), email.strip() or None, phone.strip() or None))
    return cursor.lastrowid


def list_contacts(conn, where="", params=()):
    sql = "SELECT id, name, email, phone FROM contacts " + where + " ORDER BY name COLLATE NOCASE"
    return conn.execute(sql, params).fetchall()


def find(conn, text):
    pattern = f"%{text.strip()}%"
    return list_contacts(conn, "WHERE name LIKE ? OR email LIKE ?", (pattern, pattern))


def delete(conn, contact_id):
    with conn:
        return conn.execute("DELETE FROM contacts WHERE id = ?", (contact_id,)).rowcount


def show(rows):
    if not rows:
        print("  (no contacts)")
    for cid, name, email, phone in rows:
        print(f"  {cid:<3}{name:<15}{email or '':<22}{phone or ''}")


def main(conn):
    while True:
        command = input("Command (add/list/find/delete/quit): ").strip().lower()
        if command == "add":
            name, email, phone = input("Name: "), input("Email: "), input("Phone: ")
            try:
                new_id = add_contact(conn, name, email, phone)
                print(f"Added contact {new_id}.")
            except sqlite3.IntegrityError as err:      # the database's own rules refused the row
                if "contacts.email" in str(err):
                    print("That email is already used by another contact.")
                else:
                    print("A contact needs a name.")
        elif command == "list":
            show(list_contacts(conn))
        elif command == "find":
            show(find(conn, input("Search for: ")))
        elif command == "delete":
            text = input("Id to delete: ").strip()
            if not text.isdigit():
                print("Please type the contact's number.")
            elif delete(conn, int(text)):
                print("Deleted.")
            else:
                print("No contact has that id.")
        elif command == "quit":
            break
        else:
            print("Unknown command.")


DB.unlink(missing_ok=True)       # start fresh for this demo - remove this line to keep your contacts
connection = connect()
main(connection)
connection.close()
```

## Test your program

Add a contact without an email (allowed), two without emails (allowed - NULLs don't clash), two with the same
email (refused), an empty name (refused). Search with capitals. Quit, run again (without the `unlink` line) and
check your contacts are still there. Try typing `' OR '1'='1` as a search - it must find nothing special.
