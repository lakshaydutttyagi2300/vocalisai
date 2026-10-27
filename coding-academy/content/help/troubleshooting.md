---
id: troubleshooting
title: Troubleshooting - when something goes wrong
category: Help
order: 3
---

# Troubleshooting

Find the symptom below. Each answer says what it means and what to do.

## "Python was not found" / "'py' is not recognized" during installation
Python is not installed, or was installed without "Add python.exe to PATH".
**Fix:** run the Python installer again, choose *Modify* (or reinstall), and make sure "Add python.exe to PATH"
is ticked. Close and reopen any terminal windows, then run the installer script again.

## The installer says a package could not be installed
Usually no internet connection, or a very new Python version for which some packages are not ready yet.
**Fix:** check your internet connection and run the installer again. If the error mentions building
"PyYAML", "pyarrow" or "numpy", your Python is probably too new: install **Python 3.14** (you can keep your other
Python) and run the installer again - it switches to 3.14 by itself.

## The black window opens and closes immediately
The start script hit an error before you could read it. **Fix:** open a terminal in the app folder and run the
start command by hand (`start_windows.bat` typed in Command Prompt, or `bash start_mac_linux.sh`) to see the
message. The most common cause is that the installer was never run (no `.venv` folder).

## The browser does not open
Open your browser and go to `http://localhost:8501` yourself. If a different number was printed in the terminal
(e.g. 8502), use that.

## "Port 8501 is already in use"
The app is probably already running in another window. Use that one, or close it first. Streamlit then uses
the next free port (8502...) - look at the address printed in the terminal.

## The page says "Connection error" or keeps loading
The app was stopped (the terminal window was closed). Start it again.

## My code runs forever / "Your program took too long"
Your program contains a loop that never ends. The lab stops it after the time limit (Settings). Check that the
loop's condition can become False.

## "EOFError: EOF when reading a line"
Your program asks for input but the *Input for your program* box is empty. Type one answer per line.

## "PermissionError: [Practice lab safety rule] ..."
Your program tried to change a file outside the practice folder or start another program. Use simple file names
(like `data.txt`) so files are created inside the practice folder.

## An exercise marks my answer wrong but I think it is right
Read the checks list: it says which check failed and, for output, shows expected and actual side by side.
Common causes: a missing space or capital letter, an extra print line, or a different prompt text for
`input()`. For SQL: different columns, column order, or row order (when the exercise asks for ORDER BY).

## The SQL practice database seems broken (missing tables or rows)
You probably changed or deleted data while practising - that is fine. Press *Reset practice database* in the
SQL Lab to restore the original sample data.

## "Content file problem" message
A lesson or article file has a formatting mistake (usually in a file you added or edited). The message names
the file and the problem. Fix the file, or move it out of the `my_content` folder. The rest of the app keeps
working.

## My progress disappeared
Check you are starting the app from the same folder as before - your progress is in that folder's `data`
directory. If the data was lost, use *Backup & Restore* → *Restore* with your latest backup.

## Restoring a backup failed
The app checks backups before restoring and explains any problem. Your current data is not changed by a failed
restore. Try an older backup.

## The AI tutor does not answer
See the AI Tutor page → *Test the connection*. For Ollama/LM Studio, make sure that program is running. For
Claude, check your API key and account credit. The rest of the app works without the AI tutor.

## Anything else
Note exactly what you did and the full message, search the Knowledge Base, and check `docs/PROJECT_STATUS.md`
("Known limitations").
