---
id: py-0-2-files-folders-terminal
title: Files, folders, editors and the terminal
track: python
level: 0
order: 2
minutes: 35
summary: The everyday tools of programming - files and extensions, folders and paths, text editors, the terminal, commands, and running a Python file.
objectives:
  - Explain what files, file extensions, folders (directories) and paths are
  - Describe what a text editor is and why programmers use one instead of a word processor
  - Open a terminal on your computer and run a simple command
  - Check that Python is installed and see its version
  - Explain what happens when you "run" a Python file
prerequisites: [py-0-1-what-is-a-program]
tags: [file, extension, folder, directory, path, terminal, command prompt, powershell, command, text editor, install]
---

## Simple explanation

Before writing bigger programs, it helps to understand the tools around them.

**Files.** Everything on your computer is stored in **files**: photos, documents, music, programs. Each file has
a **name**, usually followed by a dot and an **extension** that hints what kind of file it is:

| File name | Extension | What it is |
|---|---|---|
| `holiday.jpg` | `.jpg` | A photo |
| `letter.docx` | `.docx` | A Word document |
| `notes.txt` | `.txt` | Plain text |
| `hello.py` | `.py` | A Python program (plain text containing Python code) |
| `report.csv` | `.csv` | A table of data as plain text |

**Folders.** Files are organised into **folders** (programmers often say **directories** - it means the same
thing). Folders can contain other folders, like boxes inside boxes.

**Paths.** A **path** is the "address" of a file: the list of folders you open to reach it.

- Windows: `C:\Users\Asha\Documents\hello.py`
- Mac/Linux: `/Users/asha/Documents/hello.py`

**Text editors.** Python code is *plain text*: just characters, no fonts or colours stored inside. Programmers
write it in a **text editor** - a program for editing plain text (Notepad on Windows, TextEdit in plain-text
mode on Mac, or a programmer's editor such as Visual Studio Code). A word processor like Word is the wrong tool:
it adds hidden formatting and "smart quotes" (“ ”) that Python does not understand.

**The terminal.** A **terminal** (also called the **command prompt**, **command line**, **PowerShell** on
Windows, or **Terminal** on Mac) is a window where you control the computer by *typing* instead of clicking.
Each line you type is a **command**. Press Enter, and the computer runs it and prints a reply.

**Running a Python file.** To run `hello.py`, you ask the **Python interpreter** (the program that understands
Python) to read the file and carry out its instructions: in a terminal you type `python hello.py` (on Windows
often `py hello.py`).

In *this* app you do not need the terminal for practice: the **Run** button does the same job for you. But you
will meet the terminal when installing or starting the app, so it is worth understanding.

## Real-world analogy

- **Folders and files** are like a **filing cabinet**: drawers (folders) contain folders, which contain papers
  (files).
- A **path** is like a **postal address**: country → city → street → house number. `C:\Users\Asha\Documents\hello.py`
  says: drive C → Users → Asha → Documents → the file hello.py.
- The **terminal** is like **texting** a very literal assistant: you send one precise instruction, it replies.
  Misspell the instruction and it says it does not understand.

## Technical definition

- **File**: a named sequence of bytes stored on a disk. The **extension** (`.py`, `.txt`) is part of the name
  used by the operating system to choose which program opens it.
- **Directory (folder)**: a container for files and other directories, forming a tree.
- **Path**: the location of a file in that tree. An **absolute path** starts at the top (`C:\...` or `/...`).
  A **relative path** starts from the *current folder* (for example just `notes.txt`).
- **Working directory (current folder)**: the folder a program or terminal is "standing in". Relative paths are
  looked up from there. In this app's Python Lab, the working directory is your **practice folder**.
- **Terminal / shell**: a program that reads typed commands and runs them. Windows: Command Prompt or
  PowerShell. Mac: Terminal (zsh). Linux: Terminal (bash).
- **Command**: a program name plus optional **arguments**, e.g. `python --version` runs `python` with the
  argument `--version`.
- **Python interpreter**: the program (`python`, or `py` on Windows) that reads Python source code and
  executes it.

## Step-by-step examples

**Example 1 - open a terminal**

- **Windows:** press the Windows key, type `PowerShell`, press Enter. A blue or black window opens with a line
  like `PS C:\Users\Asha>` - that is the **prompt**; it shows the current folder and waits for a command.
- **Mac:** press Cmd + Space, type `Terminal`, press Enter. The prompt ends with `%`.

**Example 2 - your first commands** (type each line and press Enter)

| Windows (PowerShell) | Mac / Linux | What it does |
|---|---|---|
| `pwd` | `pwd` | Prints the current folder ("print working directory") |
| `ls` | `ls` | Lists files and folders in the current folder |
| `cd Documents` | `cd Documents` | Moves into the Documents folder ("change directory") |
| `cd ..` | `cd ..` | Moves up one folder |
| `py --version` | `python3 --version` | Shows which Python version is installed |

If `py --version` prints something like `Python 3.13.1`, Python is installed. If you see *"not recognized"* or
*"command not found"*, Python is not installed (or not on the PATH) - see the README's installation section.

**Example 3 - a program that creates a file**

```python
file = open("hello.txt", "w")
file.write("Hi from Python!")
file.close()
print("I created hello.txt")
```

Line by line: `open("hello.txt", "w")` opens a file named `hello.txt` for **w**riting (creating it if needed);
`.write(...)` puts text into it; `.close()` finishes and saves it; `print` reports what happened. Because the
path `hello.txt` is *relative*, the file is created in the current folder - in this app, your practice folder.
(You will learn files properly in Level 7. For now, just notice that programs can create files.)

## Common mistakes

- **Writing code in a word processor.** Word and similar programs insert curly quotes `“ ”` and hidden
  formatting. Use a text editor (or this app).
- **Hidden file extensions on Windows.** Windows often hides extensions, so `hello.py` may really be
  `hello.py.txt`. In File Explorer choose *View → Show → File name extensions*.
- **Typing Python code into the terminal prompt.** `print("hi")` typed at `PS C:\>` is not understood -
  the terminal expects *commands*. Python code belongs in a `.py` file (or in Python's own interactive mode).
- **Being in the wrong folder.** `python hello.py` only works if `hello.py` is in the current folder (or you
  give its full path). Use `pwd` and `ls` to check where you are.
- **Spaces in paths.** A path containing spaces must be wrapped in quotes in the terminal:
  `cd "C:\My Projects"`.

## Practical application

You will use these skills to install and start this app, to run your own Python files outside the app, to find
your backups and to organise project folders. Professional developers use the terminal every day - it is
faster and can be automated.

## Revision notes

- Files have **names** and **extensions** (`.py` = Python code, `.txt` = plain text).
- Folders = **directories**. A **path** is a file's address: absolute (`C:\...`, `/Users/...`) or relative
  (`notes.txt`, from the current folder).
- Python code is plain text - write it in a **text editor**, not a word processor.
- The **terminal** runs typed **commands**: `pwd`, `ls`, `cd folder`, `cd ..`.
- Check Python: `py --version` (Windows) or `python3 --version` (Mac/Linux).
- Run a file: `py hello.py` / `python3 hello.py`. In this app, the **Run** button does this for you.
- This app runs your code with the **practice folder** as its current folder.

```exercise
id: check-python-version
title: Open a terminal and check your Python version
difficulty: beginner
instructions: |
  This is a practical task on your own computer (not in the code box).

  1. Open a terminal: **Windows** - press the Windows key, type `PowerShell`, press Enter.
     **Mac** - press Cmd + Space, type `Terminal`, press Enter.
  2. Type `py --version` (Windows) or `python3 --version` (Mac/Linux) and press Enter.
  3. You should see something like `Python 3.13.1`.
  4. Also try `pwd` and `ls` to see which folder you are in and what it contains.

  When you have done it, press **I have done this**.
hints:
  - Commands must be typed exactly, including the two dashes in `--version`.
  - If you see "not recognized" on Windows, try `python --version` instead. If neither works, Python is not on
    the PATH - follow the README's installation section ("Add python.exe to PATH" checkbox).
check:
  type: manual
```

```exercise
id: file-labels
title: Files and extensions
difficulty: beginner
instructions: |
  Write a program that prints exactly these two lines:

  ```text
  File name: hello.py
  Extension: .py
  ```
starter: |
  print("File name: hello.py")
hints:
  - You need a second `print(...)` line.
  - The extension includes the dot.
solution: |
  print("File name: hello.py")
  print("Extension: .py")
explanation: |
  Two `print` calls produce two lines. The extension is the part after the last dot, including the dot.
check:
  expected: |
    File name: hello.py
    Extension: .py
```

```exercise
id: create-a-file
title: A program that creates a file
difficulty: intermediate
instructions: |
  The starter program creates a file called `hello.txt` in your practice folder.
  Change it so the file is called **`my_first_file.txt`** and contains the text **`I made this file!`**.
  Keep the last line that prints a message.

  After a successful check, open the **Python Practice Lab → Practice folder** tab to see your new file.
starter: |
  file = open("hello.txt", "w")
  file.write("Hi from Python!")
  file.close()
  print("Done")
hints:
  - Change the text inside the quote marks in the first line (the file name) and in the second line (the content).
  - The file name must end with `.txt`.
solution: |
  file = open("my_first_file.txt", "w")
  file.write("I made this file!")
  file.close()
  print("Done")
explanation: |
  `open("my_first_file.txt", "w")` creates (or replaces) a file with that name in the current folder - your
  practice folder. `write` puts the text inside and `close` saves it.
check:
  expected: |
    Done
  require_text: ["my_first_file.txt"]
  tests:
    - name: my_first_file.txt exists in the practice folder
      code: |
        import os
        assert os.path.exists("my_first_file.txt"), "The file my_first_file.txt was not created."
    - name: the file contains the right text
      code: |
        content = open("my_first_file.txt").read()
        assert content == "I made this file!", f"The file contains {content!r}"
```

```exercise
id: run-from-terminal
title: Run a Python file from the terminal
difficulty: challenge
instructions: |
  A practical task that shows how programs run outside this app.

  1. Open a plain text editor: **Windows** - Notepad. **Mac** - TextEdit, then *Format → Make Plain Text*.
  2. Type: `print("Hello from my own file!")`
  3. Save it in your **Documents** folder as `hello.py`. (In Notepad choose *Save as type: All files* so it
     does not become `hello.py.txt`.)
  4. Open a terminal and move into Documents: `cd Documents`
  5. Run it: `py hello.py` (Windows) or `python3 hello.py` (Mac).
  6. You should see `Hello from my own file!`

  Press **I have done this** when it works.
hints:
  - If you get "No such file", run `ls` to check the file name and that you are in the Documents folder.
  - If the file is called `hello.py.txt`, rename it, or save again choosing "All files".
check:
  type: manual
```

```quiz
- id: q1
  question: What does the extension `.py` usually tell you about a file?
  options:
    - It contains Python source code
    - It is a picture
    - It is a spreadsheet
    - It is a folder
  answer: It contains Python source code
  explanation: Python programs are plain-text files whose names end in `.py`.
- id: q2
  question: Which is an **absolute** path?
  options:
    - "C:\\Users\\Asha\\Documents\\notes.txt"
    - notes.txt
    - Documents\notes.txt
    - ..\notes.txt
  answer: "C:\\Users\\Asha\\Documents\\notes.txt"
  explanation: An absolute path starts at the very top (a drive like `C:\` or `/`). The others are relative to the current folder.
- id: q3
  question: Why should you not write Python code in a word processor like Word?
  options:
    - It adds formatting and curly quotes that Python does not understand
    - Word cannot save files
    - Python only reads handwritten code
    - Word deletes the code
  answer: It adds formatting and curly quotes that Python does not understand
  explanation: Python needs plain text with straight quotes. Use a text editor.
- id: q4
  question: In a terminal, which command moves you **up** one folder?
  type: text
  answer: ["cd ..", "cd.."]
  explanation: "`cd ..` changes directory to the parent folder. `..` means \"one level up\"."
- id: q5
  question: What does the command `py --version` (or `python3 --version`) do?
  options:
    - Shows which version of Python is installed
    - Installs Python
    - Deletes old Python versions
    - Runs a Python file called version
  answer: Shows which version of Python is installed
  explanation: The `--version` argument asks the Python program to print its version number and stop.
- id: q6
  question: In this app's Python Lab, where does a program put a file opened with `open("notes.txt", "w")`?
  options:
    - In your practice folder (the program's current folder)
    - On the desktop
    - In the app's content folder
    - On the internet
  answer: In your practice folder (the program's current folder)
  explanation: A relative path like `notes.txt` is looked up in the current folder, which in the lab is your practice folder.
```
