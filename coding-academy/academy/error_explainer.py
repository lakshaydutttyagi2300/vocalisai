"""Plain-English explanations for Python and SQL error messages.

Works completely offline. Each explanation says what the error means,
the most likely cause, and what to try next.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class Explanation:
    title: str
    meaning: str
    likely_causes: list[str]
    what_to_try: list[str]

    def as_markdown(self) -> str:
        parts = [f"**{self.title}**", "", self.meaning]
        if self.likely_causes:
            parts += ["", "**Most likely causes:**"] + [f"- {c}" for c in self.likely_causes]
        if self.what_to_try:
            parts += ["", "**What to try:**"] + [f"{i}. {t}" for i, t in enumerate(self.what_to_try, 1)]
        return "\n".join(parts)


_PYTHON = {
    "SyntaxError": Explanation(
        "SyntaxError - Python could not understand the grammar of your code",
        "Before running anything, Python reads your whole program. A SyntaxError means some line "
        "breaks Python's grammar rules, so *nothing* ran.",
        [
            "A missing closing bracket `)`, `]` or `}` or quote mark `\"`.",
            "A missing colon `:` at the end of an `if`, `for`, `while`, `def` or `class` line.",
            "Using `=` (store a value) where you meant `==` (compare two values).",
            "A typo in a keyword, for example `pirnt` is fine as a name but `iff x:` is not valid.",
        ],
        [
            "Look at the line number in the message, and also the line *just before it* - the real "
            "mistake is often one line earlier.",
            "The `^` arrow points at where Python got confused.",
            "Count your brackets and quotes: every opening one needs a closing one.",
        ],
    ),
    "IndentationError": Explanation(
        "IndentationError - the spaces at the start of a line are wrong",
        "Python uses the spaces at the start of a line (the *indentation*) to know which lines belong "
        "together, for example which lines are inside an `if` or a loop.",
        [
            "A line after a colon `:` is not indented.",
            "A line is indented when it should not be.",
            "Mixing tabs and spaces, or using a different number of spaces on lines that belong together.",
        ],
        [
            "Use exactly 4 spaces for each level of indentation (in this app the Tab key inserts 4 spaces).",
            "Make every line inside the same block start at the same column.",
        ],
    ),
    "TabError": Explanation(
        "TabError - tabs and spaces are mixed",
        "Some lines are indented with a Tab character and others with spaces, so Python cannot tell "
        "how far each line is indented.",
        ["Code copied from a website or another editor."],
        ["Delete the indentation on the reported lines and type 4 spaces instead."],
    ),
    "NameError": Explanation(
        "NameError - Python does not know this name",
        "You used a name (a variable or function) that Python has not seen yet.",
        [
            "A spelling mistake, or different capital letters (`Name` and `name` are different).",
            "Using a variable *before* the line that creates it.",
            "Forgetting quote marks around text, so Python thinks the text is a variable name: "
            "`print(hello)` instead of `print(\"hello\")`.",
            "The variable was created inside a function and you are using it outside.",
        ],
        [
            "Check the exact spelling of the name in the message against where you created it.",
            "Make sure the line that creates the variable runs before the line that uses it.",
        ],
    ),
    "TypeError": Explanation(
        "TypeError - an operation was used with the wrong type of value",
        "Every value has a *type* (text, whole number, decimal number, list, ...). Some operations only "
        "work with certain types, for example you cannot add text to a number.",
        [
            "Joining text and a number with `+`, e.g. `\"Age: \" + 30`. Use `str(30)` or an f-string.",
            "`input()` always gives you text - convert it with `int()` or `float()` before doing maths.",
            "Calling a function with too many or too few values (arguments).",
            "Trying to call something that is not a function, e.g. a missing operator: `2(3)`.",
        ],
        [
            "Read the end of the message - it names the types involved (`str`, `int`, ...).",
            "Use `print(type(x))` to see what type a variable really holds.",
        ],
    ),
    "ValueError": Explanation(
        "ValueError - right type of value, but an unusable value",
        "The function received the correct kind of value, but this particular value does not make sense.",
        [
            "`int(\"hello\")` or `int(\"3.5\")` - the text is not a whole number.",
            "Unpacking the wrong number of items: `a, b = [1, 2, 3]`.",
        ],
        [
            "Print the value just before the failing line to see what it really contains.",
            "If it comes from `input()`, check what you typed in the Input box.",
        ],
    ),
    "ZeroDivisionError": Explanation(
        "ZeroDivisionError - dividing by zero",
        "Maths does not allow division by zero, and neither does Python.",
        ["A variable you divide by is 0, often because a list was empty or a count was not increased."],
        ["Check the value before dividing: `if count != 0:`."],
    ),
    "IndexError": Explanation(
        "IndexError - that position does not exist",
        "You asked for an item at a position (index) that is outside the list or text.",
        [
            "Positions start at 0, so the last item of a 3-item list is at position 2, not 3.",
            "The list is empty.",
            "A loop goes one step too far.",
        ],
        ["Print `len(your_list)` to see how many items there are.", "Use `your_list[-1]` for the last item."],
    ),
    "KeyError": Explanation(
        "KeyError - that key is not in the dictionary",
        "You looked up a key in a dictionary, but the dictionary has no such key.",
        ["A spelling or capital-letter difference in the key.", "The key was never added."],
        [
            "Print the dictionary's keys with `print(my_dict.keys())`.",
            "Use `my_dict.get(key)` which returns `None` instead of crashing when the key is missing.",
        ],
    ),
    "AttributeError": Explanation(
        "AttributeError - this value does not have that ability",
        "You used `.something` on a value, but that type of value has no `something`.",
        [
            "A typo in a method name, e.g. `.uper()` instead of `.upper()`.",
            "The variable holds a different type than you think - often `None`.",
            "Using a list method on text (or the other way round), e.g. `\"abc\".append(\"d\")`.",
        ],
        ["Use `print(type(x))` to check the type.", "Use `print(dir(x))` to list what it can do."],
    ),
    "ModuleNotFoundError": Explanation(
        "ModuleNotFoundError - Python cannot find that module",
        "`import` looks for a module (a file of ready-made code). This one is not installed or is misspelled.",
        [
            "A spelling mistake in the module name.",
            "The package is not installed in the app's virtual environment.",
        ],
        [
            "Check the spelling.",
            "Lesson *Packages and virtual environments* explains how to install packages with `pip`.",
        ],
    ),
    "ImportError": Explanation(
        "ImportError - the import did not work",
        "The module was found, but the name you asked for is not inside it.",
        ["A misspelled name after `from module import ...`."],
        ["Check the spelling, or import the whole module and look at `dir(module)`."],
    ),
    "FileNotFoundError": Explanation(
        "FileNotFoundError - that file does not exist (here)",
        "Python looked for the file but could not find it. In the practice lab, programs run inside your "
        "*practice folder*, so relative file names are looked up there.",
        [
            "The file was never created, or has a different name or extension (`.txt` vs `.csv`).",
            "The file is in a different folder.",
        ],
        [
            "Create the file first (write to it), then read it.",
            "Look at the *Files in your practice folder* list in the Python Lab.",
        ],
    ),
    "PermissionError": Explanation(
        "PermissionError - not allowed",
        "The operating system (or the practice lab's safety rules) refused this action.",
        [
            "The practice lab only allows changing files inside your practice folder.",
            "The practice lab does not allow starting other programs.",
            "The file is open in another program (common on Windows).",
        ],
        [
            "Use simple file names like `notes.txt` so files are created in your practice folder.",
            "Close the file in any other program and try again.",
        ],
    ),
    "RecursionError": Explanation(
        "RecursionError - a function called itself too many times",
        "A function that calls itself must have a stopping condition (a *base case*). Without one it "
        "keeps calling itself until Python gives up.",
        ["The base case is missing or never reached."],
        ["Check the `if` that should stop the recursion and make sure each call gets closer to it."],
    ),
    "EOFError": Explanation(
        "EOFError - your program asked for input, but there was none",
        "Your program called `input()`, but the **Input for your program** box was empty (or had fewer "
        "lines than the number of `input()` calls).",
        ["The Input box is empty.", "Your program asks more questions than there are lines in the box."],
        [
            "Type the answers in the *Input for your program* box - one line for each `input()` call - "
            "then press Run again.",
        ],
    ),
    "UnboundLocalError": Explanation(
        "UnboundLocalError - a variable used inside a function before it was given a value there",
        "Inside a function you change a variable that also exists outside it. Python then treats it as a "
        "new local variable, which has no value yet.",
        ["Using `count += 1` inside a function when `count` was created outside the function."],
        ["Pass the value in as a parameter and `return` the new value instead."],
    ),
    "AssertionError": Explanation(
        "AssertionError - a check failed",
        "An `assert` statement checks that something is True. This one was False.",
        [],
        ["Read the condition after `assert` and print the values involved."],
    ),
    "OutputLimitReached": Explanation(
        "Too much output",
        "Your program printed a huge amount of text, so the lab stopped it to keep the app responsive.",
        ["A loop that never ends, or prints on every step of a very long loop."],
        ["Check your loop's stopping condition.", "Print less often, or print only the final result."],
    ),
    "KeyboardInterrupt": Explanation(
        "The program was interrupted", "The program was stopped before it finished.", [], []
    ),
    "MemoryError": Explanation(
        "MemoryError - out of memory",
        "Your program tried to use more memory than allowed.",
        ["A list that grows forever inside a loop.", "Creating an enormous list or text."],
        ["Check that your loop stops.", "Work with smaller amounts of data."],
    ),
    "ResourceLimit": Explanation(
        "Stopped by the safety limits",
        "Your program used too much memory or processor time, so the lab stopped it.",
        ["A loop that never ends.", "A list that keeps growing."],
        ["Check the stopping condition of your loops."],
    ),
}

_TIMEOUT = Explanation(
    "Your program took too long",
    "The lab stops programs that run longer than the time limit (you can change it in Settings). "
    "This almost always means a loop never ends.",
    [
        "A `while` loop whose condition never becomes False - for example you forgot to change the "
        "counter (`count += 1`) inside the loop.",
        "Waiting for something that never happens.",
    ],
    [
        "Check that something inside the loop moves it towards stopping.",
        "Add a `print()` inside the loop to watch what happens on each step.",
    ],
)

_GENERIC = Explanation(
    "An error happened",
    "Python stopped because something went wrong. The last line of the message names the error type "
    "and gives details.",
    [],
    [
        "Read the last line of the message first.",
        "Look at the line number mentioned, and print the values used on that line.",
        "Search for the error name in the Knowledge Base.",
    ],
)


def explain_python_error(error: dict | None, timed_out: bool = False) -> Explanation | None:
    """Return an explanation for a RunResult's error (or a timeout)."""
    if timed_out:
        return _TIMEOUT
    if not error:
        return None
    error_type = error.get("type") or ""
    message = error.get("message") or ""
    base = _PYTHON.get(error_type, _GENERIC)
    extra: list[str] = []
    if error_type == "TypeError" and "can only concatenate str" in message:
        extra.append("You used `+` to join text with a number. Convert the number first: `str(number)`, "
                     "or use an f-string: `f\"Total: {number}\"`.")
    if error_type == "TypeError" and "unsupported operand" in message and "'str'" in message:
        extra.append("One of the values is text (`str`). If it came from `input()`, convert it with "
                     "`int(...)` or `float(...)`.")
    if error_type == "ValueError" and "invalid literal for int()" in message:
        extra.append("`int()` can only convert text that looks like a whole number, such as `\"42\"`. "
                     "For decimals use `float()`.")
    if error_type == "SyntaxError" and "'(' was never closed" in message:
        extra.append("An opening bracket `(` has no matching `)`.")
    if error_type == "SyntaxError" and "expected ':'" in message:
        extra.append("Add a colon `:` at the end of the `if`/`for`/`while`/`def` line.")
    if error_type == "SyntaxError" and "unterminated string" in message:
        extra.append("A text value is missing its closing quote mark.")
    if error_type == "NameError" and "Did you mean" in message:
        extra.append("Python has a suggestion in the message - read the part after *Did you mean*.")
    if error.get("blocked"):
        extra.append("This was blocked by the practice lab's safety rules (see *How the Python Lab keeps "
                     "you safe* on the Python Lab page).")
    if not extra:
        return base
    return Explanation(base.title, base.meaning, base.likely_causes, extra + base.what_to_try)


_SQL_PATTERNS: list[tuple[str, Explanation]] = [
    (r"no such table", Explanation(
        "That table does not exist",
        "The database has no table with that name.",
        ["A spelling mistake in the table name.", "Using the wrong practice database.",
         "The table was dropped - use *Reset practice database* to bring it back."],
        ["Look at the table list on the left of the SQL Lab and copy the exact name."])),
    (r"no such column", Explanation(
        "That column does not exist",
        "One of the column names in your query is not in the table(s) you are using.",
        ["A spelling mistake.", "The column belongs to a different table that is not in your FROM/JOIN.",
         "Text values written without quotes are treated as column names: use 'single quotes' for text."],
        ["Open the table's structure in the left panel to see the exact column names.",
         "Put text values in single quotes: `WHERE city = 'London'`."])),
    (r"syntax error", Explanation(
        "SQL syntax error",
        "SQLite could not understand the grammar of your query. The message shows the word near the problem.",
        ["Keywords in the wrong order (the order is SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT).",
         "A missing or extra comma between columns.", "A missing closing bracket or quote."],
        ["Look at the word quoted in the message - the mistake is just before it.",
         "Check commas: one between each column, none after the last one."])),
    (r"ambiguous column name", Explanation(
        "Ambiguous column name",
        "Two of the tables in your query have a column with this name, so SQLite does not know which one you mean.",
        ["Joining tables that both have, for example, an `id` or `name` column."],
        ["Put the table name (or alias) in front: `customers.name` or `c.name`."])),
    (r"misuse of aggregate", Explanation(
        "Aggregate used in the wrong place",
        "Functions like COUNT, SUM and AVG work on groups of rows. They cannot be used in WHERE.",
        ["Using `WHERE COUNT(*) > 5`."],
        ["Use HAVING for conditions on aggregates: `GROUP BY ... HAVING COUNT(*) > 5`."])),
    (r"UNIQUE constraint failed", Explanation(
        "Duplicate value not allowed",
        "This column must contain unique values, and the value you inserted already exists.",
        ["Inserting a row with an id or email that is already used."],
        ["Choose a different value, or leave out the id so SQLite picks one."])),
    (r"NOT NULL constraint failed", Explanation(
        "A required value is missing",
        "This column must always have a value, but your INSERT or UPDATE left it empty (NULL).",
        [], ["Include a value for that column."])),
    (r"FOREIGN KEY constraint failed", Explanation(
        "Broken link between tables",
        "A foreign key must point to a row that exists in the other table.",
        ["Inserting an order for a customer id that does not exist.",
         "Deleting a row that other rows still point to."],
        ["Check the referenced id exists first."])),
    (r"CHECK constraint failed", Explanation(
        "A rule on the table was broken",
        "The table has a CHECK rule (for example 'price must be positive') and your value breaks it.",
        [], ["Read the table definition to see the rule."])),
    (r"not authorized|ATTACH|VACUUM INTO", Explanation(
        "Not allowed in the practice lab",
        "To protect your progress data, the SQL Lab does not allow attaching other database files or "
        "writing database copies.", [], ["Stay within the practice database you selected."])),
    (r"interrupted|took too long", Explanation(
        "The query took too long",
        "The lab stops queries that run too long. A recursive query without a stopping condition, or "
        "joining large tables without a join condition, are the usual causes.",
        [], ["Add a stopping condition (WHERE) to recursive CTEs.", "Check every JOIN has an ON condition."])),
    (r"SELECTs to the left and right of (UNION|EXCEPT|INTERSECT)", Explanation(
        "UNION parts do not match",
        "Every SELECT in a UNION must return the same number of columns.", [],
        ["Make each SELECT list the same number of columns, in the same order."])),
    (r"incomplete input", Explanation(
        "The statement is not finished",
        "SQLite reached the end of your text in the middle of a statement.",
        ["A missing closing bracket or quote mark."], ["Check brackets and quotes."])),
]


def explain_sql_error(message: str) -> Explanation:
    for pattern, explanation in _SQL_PATTERNS:
        if re.search(pattern, message, flags=re.IGNORECASE):
            return explanation
    return Explanation(
        "SQL error",
        "SQLite could not run your query. Read the message for details.",
        [],
        ["Check table and column names in the left panel.", "Run a simpler version of the query first, "
         "then add one part at a time."],
    )
