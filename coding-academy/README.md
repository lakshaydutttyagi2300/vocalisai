# My Personal Coding Academy

A complete learning application that teaches **Python** (a programming language) and **SQL** (the language for
asking questions of databases) from absolute zero - with lessons, interactive exercises that check your answers,
quizzes, projects, progress tracking, spaced revision, a searchable knowledge base and backups.

It runs **entirely on your own computer**. After installation it works **without the internet**, without a
Claude subscription and without any paid service. An AI tutor is available as an **optional** extra.

---

## Contents

1. [What you get](#1-what-you-get)
2. [What you need](#2-what-you-need)
3. [Words you will meet in this guide](#3-words-you-will-meet-in-this-guide)
4. [Installing - Windows](#4-installing---windows)
5. [Installing - Mac](#5-installing---mac)
6. [Installing - Linux](#6-installing---linux)
7. [Starting, stopping and reopening the app](#7-starting-stopping-and-reopening-the-app)
8. [Using the app](#8-using-the-app)
9. [Where your progress is stored](#9-where-your-progress-is-stored)
10. [Backing up and restoring](#10-backing-up-and-restoring)
11. [Updating the app](#11-updating-the-app)
12. [Working offline, internet use and costs](#12-working-offline-internet-use-and-costs)
13. [The optional AI tutor (and replacing the provider)](#13-the-optional-ai-tutor-and-replacing-the-provider)
14. [Troubleshooting](#14-troubleshooting)
15. [Continuing without Claude](#15-continuing-without-claude)
16. [What is in this folder](#16-what-is-in-this-folder)

---

## 1. What you get

| Section | What it does |
|---|---|
| **Home** | Where you stopped, what to learn next, what to revise, recent results |
| **Python Academy** | 48 lessons in 12 levels, from "what is a program?" to decorators, testing and concurrency |
| **SQL Academy** | 24 lessons in 8 levels, from "what is a database?" to window functions, design and transactions |
| **Python Practice Lab** | Write and run real Python code safely; all 192 Python exercises in one place |
| **SQL Practice Lab** | Explore 7 sample databases and run any SQL; resettable at any time; 94 SQL exercises |
| **Quizzes & Assessments** | Revision quizzes, lesson quizzes and level assessments |
| **Projects & Challenges** | 20 practical projects (10 Python, 10 SQL) with beginner/intermediate/extension stages, hints and sample solutions |
| **Progress & Revision** | Mastery estimates from real results, topics to revise, exports |
| **Knowledge Base** | Offline search across lessons, glossary, error guides, cheat sheets, FAQ and your notes |
| **Notes & Bookmarks** | Your own notes (linked to lessons) and saved lessons/articles |
| **AI Tutor** | Optional: Claude, a free local model (Ollama) or another provider |
| **Backup & Restore** | One-click backups (works great with a Google Drive folder) and safe restores |
| **Settings** | Your name, time limits, quiz pass mark, backup folder |
| **Help & Troubleshooting** | How-to guides inside the app |

The exact list of finished lessons and any unfinished parts are in
[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

---

## 2. What you need

- A computer running **Windows 10 or 11**, **macOS 12 or newer**, or **Linux**.
- **Python 3.13 or 3.14** (free) - the app was tested with both. Python 3.12 also works. **If you already have
  one of these, you don't need to install Python again.** (Python 3.15 is not supported yet: one package the
  app needs isn't ready for it on Windows.)
- About **600 MB** of free disk space.
- An internet connection **only during installation**.
- A web browser (Chrome, Edge, Firefox or Safari). The app shows its pages in your browser, but the pages come
  from your own computer, not from the internet.

---

## 3. Words you will meet in this guide

- **Folder** (also *directory*): a container for files, like `Documents`.
- **File extension**: the end of a file name after the dot - `.bat`, `.py`, `.zip`. Windows hides these by
  default; to show them open File Explorer → **View** → **Show** → **File name extensions**.
- **Terminal**: a window where you type commands instead of clicking. On Windows it is called *PowerShell* or
  *Command Prompt*; on Mac it is called *Terminal*. You only need it on Mac/Linux, or if something goes wrong.
- **Command**: one line typed into a terminal, followed by Enter.
- **Python**: the programming language - and also the program that runs Python code.
- **Package**: ready-made code the app uses (for example *Streamlit*, which draws the pages). The installer
  downloads them for you.
- **Virtual environment (`.venv`)**: a private folder inside the app folder that holds the app's own copy of
  its packages, so it never interferes with anything else on your computer.
- **localhost**: your computer's name for itself. `http://localhost:8501` means "the app running on this
  computer".

---

## 4. Installing - Windows

### Step 1 - Install Python 3.13 (skip if you already have 3.12, 3.13 or 3.14)

**Why:** the app is written in Python, so your computer needs Python to run it.

**Already have Python?** Press the Windows key, type `PowerShell`, press Enter, type `py --version` and press
Enter. If it shows `Python 3.12.x`, `3.13.x` or `3.14.x`, skip to Step 2. If it shows 3.15 or newer, keep it
and *also* install 3.14 or 3.13 as below - several versions can live side by side, and the installer picks a
tested one automatically.

1. Open your browser and go to **https://www.python.org/downloads/**.
2. Find **Python 3.13** (for example "Python 3.13.9") and download the **Windows installer (64-bit)**.
   (Python 3.14 is equally fine. If the big yellow button offers 3.15 or newer, scroll down to "Looking for a
   specific release?" and pick the newest 3.14 or 3.13 version.)
3. Open the downloaded file (it is in your *Downloads* folder).
4. **Important:** on the first screen, tick the box **"Add python.exe to PATH"** at the bottom. This lets the
   installer script find Python.
5. Click **Install Now** and wait. Click **Close** when it says "Setup was successful".

**Check it worked (optional):** press the Windows key, type `PowerShell`, press Enter. In the window type
`py --version` and press Enter. You should see `Python 3.13.x` (or 3.14.x). If you see *"not recognized"*, run the Python
installer again, choose **Modify**, and make sure "Add python.exe to PATH" is ticked.

### Step 2 - Put the app folder in a permanent place

**Why:** the app keeps your progress inside its own folder, so it should live somewhere you will not delete by
accident.

1. If you received a `.zip` file, find it in *Downloads*, **right-click** it → **Extract All...** → choose your
   **Documents** folder → **Extract**.
2. You should now have a folder such as `Documents\coding-academy` containing files like `README.md`,
   `install_windows.bat` and `start_windows.bat`.

(If you downloaded the whole GitHub repository, the app is the `coding-academy` folder inside it - move that
folder to *Documents*.)

### Step 3 - Run the installer (once)

**Why:** this downloads the packages the app needs and sets up its private Python folder (`.venv`).

1. Open the `coding-academy` folder.
2. **Double-click `install_windows.bat`.**
   - If Windows shows *"Windows protected your PC"*, click **More info** → **Run anyway**. (This appears for any
     script downloaded from the internet. The script is plain text - you can open it with Notepad to read every
     line.)
3. A black window shows the progress in three steps. Downloading takes **2 to 10 minutes**.
4. When you see **"Installation finished successfully!"**, press any key to close the window.

**What can go wrong:**
- *"Python was not found"* → go back to Step 1; make sure "Add python.exe to PATH" was ticked.
- *"some packages could not be installed"* → check your internet connection and double-click the installer
  again. If the messages mention "building wheel", "PyYAML", "pyarrow" or "numpy", you are probably on a very
  new Python - install Python 3.14 (you can keep your other Python) and run the installer again; it will switch
  to 3.14 by itself.

### Step 4 - Start the app

Double-click **`start_windows.bat`**. See [section 7](#7-starting-stopping-and-reopening-the-app).

**Tip:** for easy starting, right-click `start_windows.bat` → **Send to** → **Desktop (create shortcut)**.

---

## 5. Installing - Mac

### Step 1 - Install Python 3.13 (skip if you already have 3.12, 3.13 or 3.14)
1. Go to **https://www.python.org/downloads/** and download the **macOS 64-bit universal2 installer** for the
   newest **Python 3.13** or **3.14** release.
2. Open the downloaded `.pkg` file and click through the installer.

### Step 2 - Put the app folder in a permanent place
Double-click the `.zip` file to unpack it, and move the `coding-academy` folder into your **Documents** folder.

### Step 3 - Run the installer (once)
1. Open **Terminal**: press **Cmd + Space**, type `Terminal`, press Enter.
2. Type this command and press Enter (it moves the terminal into the app folder):

   ```bash
   cd ~/Documents/coding-academy
   ```

3. Type this command and press Enter (it runs the installer):

   ```bash
   bash install_mac_linux.sh
   ```

4. Wait for **"Installation finished successfully!"** (2-10 minutes).

### Step 4 - Start the app
In the same Terminal window type `bash start_mac_linux.sh` and press Enter.

---

## 6. Installing - Linux

```bash
sudo apt install python3 python3-venv      # Ubuntu/Debian; use your distribution's package manager
cd ~/Documents/coding-academy
bash install_mac_linux.sh
bash start_mac_linux.sh
```

The app needs Python 3.12 or newer (`python3 --version` shows yours).

---

## 7. Starting, stopping and reopening the app

### Start
- **Windows:** double-click `start_windows.bat`.
- **Mac/Linux:** in Terminal, `cd ~/Documents/coding-academy` then `bash start_mac_linux.sh`.

A terminal window opens and, after a few seconds, your **web browser opens the app** at
**http://localhost:8501**. If the browser does not open by itself, open it and type `http://localhost:8501` in
the address bar.

**Keep the terminal window open** while you use the app - it *is* the app. You can minimise it.

### Stop
Close the terminal window (or click into it and press **Ctrl + C**). Closing only the browser tab does **not**
stop the app.

### Reopen
Start it again the same way. Everything you did before is still there - progress is saved automatically after
every action.

### First start
On the very first start the app creates a `data` folder for your progress. The Home page shows a *Start here*
box - begin with **Python lesson 1: What is a computer program?** (or SQL lesson 1 - the tracks are
independent).

---

## 8. Using the app

### The menu
On the left of the screen. On a narrow window it is hidden: click the **›** (or **☰**) symbol at the top-left.

### The dashboard (Home)
Shows *Continue where you stopped*, the *recommended next* lesson for each track, lessons *due for revision*,
your recent quiz results and a learning streak.

### Starting a lesson
1. Open **Python Academy** or **SQL Academy**.
2. Levels are listed in order; each lesson shows a status icon (⚪ not started, 🔵 started, 🟡 practising,
   🟢 completed, 🏆 mastered). Click a lesson.
3. Each lesson has four tabs:
   - **📖 Learn** - explanation, analogy, technical definition, examples, common mistakes. Press
     **I have read this lesson** at the bottom.
   - **✍️ Practise** - exercises at three difficulty levels.
   - **✅ Quiz** - multiple-choice and typed questions with explanations.
   - **📝 Revise & next** - revision notes, your completion checklist, your mastery estimate, notes, and the
     next lesson.

A lesson is **completed** when you have read it, scored at least 70% in its quiz and passed every beginner
exercise. It then comes back as a short **review** after 1, 3, 7, 14, 30... days. **Mastered** means completed,
a high score on exercises and quizzes, *and* a passed review on a later day - opening a lesson alone never
counts.

### Practising Python
- Type code in the box. **Tab** indents 4 spaces (Shift+Tab removes them); **Enter** keeps the indentation.
  To leave the box with the keyboard, press **Esc** then **Tab**.
- **▶ Run** runs your code and shows the output - or a plain-English explanation of any error.
- **✓ Check my answer** runs automatic checks and tells you exactly what is right or wrong.
- **💡 Show a hint** reveals hints one at a time. **🔑 Solution** is available, but try first.
- If your program uses `input()`, type the answers in the **Input for your program** box (one per line).
- The **Python Practice Lab** also has free coding with saved programs, and a *Practice folder* tab showing
  files your programs created.

**Safety:** your code runs as a separate program with a time limit, an output limit, and rules that block
changing files outside the practice folder or starting other programs. This protects against accidents; it is
not designed to stop deliberately malicious code - only run code you understand. On Windows, the memory limit
is not enforced (the time limit is).

### Practising SQL
- In exercises, write SQL and press **Run** or **Check my answer**. Exercises always run on a fresh copy of the
  sample database, so nothing can break.
- **👀 Expected result** shows what the correct answer's table looks like (not the query).
- The **SQL Practice Lab** lets you pick a sample database, see its tables, run any SQL (including INSERT,
  UPDATE, DELETE, CREATE TABLE) and **Reset practice database** to restore the original data.

### Quizzes, projects, notes, search
- **Quizzes & Assessments → Revision quiz** mixes questions from lessons due for review or that you found hard.
- **Projects** have task checklists; Python projects can open their starter code in the Python Lab.
- **Notes** can be linked to lessons and exported as Markdown files.
- **Knowledge Base** searches everything, including your notes, without the internet.

---

## 9. Where your progress is stored

Everything that is yours lives in the **`data`** folder inside the app folder:

| File / folder | Contents |
|---|---|
| `data/academy.db` | progress, quiz results, exercise attempts, notes, bookmarks, saved programs, settings |
| `data/python_sandbox/` | files created by your practice programs |
| `data/practice_databases/` | SQL practice copies (can be rebuilt at any time) |
| `data/secrets.json` | AI API keys, only if you added one (never included in backups) |

The **Settings** page shows the exact paths on your computer. `academy.db` is an SQLite database - after the
SQL course you will be able to open and query it yourself!

---

## 10. Backing up and restoring

### Make a backup
Open **Backup & Restore** → **Make a backup now**. A file like
`academy-backup-2026-10-27_18-30-00-manual.zip` is saved in the backup folder (default: the `backups` folder
inside the app folder). It contains your progress, notes, saved programs, practice files and your own content -
but **not** API keys. You can also **download a copy** from that page.

The app also makes an **automatic backup** when it starts, every 7 days by default (Settings), keeping the last
10.

### Use Google Drive (recommended)
1. Install **Google Drive for desktop** (free) from Google and sign in. It adds a Google Drive folder to your
   computer - on Windows usually `G:\My Drive`.
2. Create a folder there called `CodingAcademyBackups`.
3. In the app: **Settings → Backups → Backup folder** → enter `G:\My Drive\CodingAcademyBackups`
   (Mac: something like `~/Library/CloudStorage/GoogleDrive-you@gmail.com/My Drive/CodingAcademyBackups`) →
   **Save settings**.

From now on every backup is copied to Google Drive automatically. The app itself never needs Google Drive - it
always works from the local `data` folder. Without Google Drive for desktop, download a backup and upload it at
drive.google.com.

### Restore a backup
**Backup & Restore → Restore** → choose a backup from the folder or upload a `.zip` → the app checks it and shows
what it contains → tick the confirmation → **Restore this backup**. Before restoring, the app automatically makes
a *safety backup* of your current state, so a restore can be undone.

### Move to a new computer
Install the app on the new computer (sections 4-6), start it once, then restore your latest backup.

---

## 11. Updating the app

Your data is kept separate from the app's code, so updates are safe:

1. **Make a backup** (section 10).
2. **Stop** the app.
3. Rename the app folder to `coding-academy-old`.
4. Put the new version in a new `coding-academy` folder.
5. Copy **`data`**, **`backups`** and **`my_content`** from the old folder into the new one.
6. Run the installer again, then start the app. If the progress database needs a newer structure, the app
   upgrades it automatically (a *migration*), keeping all data.
7. Once everything looks right, delete `coding-academy-old`.

---

## 12. Working offline, internet use and costs

**Works offline after installation:** all lessons, exercises, automatic checking, error explanations, quizzes,
both labs, progress and revision, the Knowledge Base search, notes, bookmarks, projects, and local backups.
The app sends no usage statistics anywhere.

**Needs the internet:** installation and updates (downloading packages); the optional AI tutor when it uses a
cloud service (Claude or others); Google Drive syncing (done by Google's program, not by the app); and your own
practice programs in the *APIs and HTTP* lesson, which fetch data from websites (offline alternatives are
provided).

**Costs:** the app and everything it uses are free. Your Claude subscription is **not** used. The only possible
cost is the **optional** AI tutor if you choose a paid service: the Claude API is billed per use through a
separate account at console.anthropic.com (prices are shown on the AI Tutor page). A local model through Ollama
is free.

---

## 13. The optional AI tutor (and replacing the provider)

Open **AI Tutor → Set up**. Choose:

- **Off** (default) - everything else still works.
- **Local model (Ollama / LM Studio)** - free and private, runs on your computer. Install Ollama from
  ollama.com, run `ollama pull llama3.2` once in a terminal, choose the Ollama preset, Save, and *Test the
  connection*.
- **Claude (Anthropic API)** - paid per use; create an API key at console.anthropic.com and paste it.
- **Another service** with an OpenAI-compatible API - enter its address, model name and key.

**Replacing the provider** is just choosing another option on that page. API keys are stored only in
`data/secrets.json` on your computer. Developers can add an entirely new provider in
`academy/ai/providers.py` - see [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md).

---

## 14. Troubleshooting

| Problem | What to do |
|---|---|
| "Python was not found" | Install Python 3.14 or 3.13 with **"Add python.exe to PATH"** ticked, then run the installer again |
| Installer fails downloading packages | Check the internet connection and run it again; if your Python is 3.15 or newer, also install 3.14 and run it again |
| Start window opens and closes at once | Run the installer first. To read the message, open PowerShell in the folder and type `.\start_windows.bat` |
| Browser does not open | Go to `http://localhost:8501` yourself (or the address printed in the terminal) |
| "Port 8501 is already in use" | The app is already running in another window - use that, or close it |
| Page shows "Connection error" | The terminal window was closed - start the app again |
| "Your program took too long" | A loop never ends - check its condition (time limit is in Settings) |
| "EOFError: EOF when reading a line" | Type answers in the *Input for your program* box |
| SQL tables or rows missing | SQL Lab → *Reset practice database* |
| "Content file problem" | A lesson/article file has a format mistake; the message says which file and what |
| Lost progress | Make sure you start the app from the same folder; otherwise restore a backup |

More: **Help & Troubleshooting** inside the app, and [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

---

## 15. Continuing without Claude

Nothing in this app depends on Claude. To keep going on your own:

- **Learning:** follow the lessons in order, do the revision quizzes, then the projects.
- **Adding material:** put Markdown articles in `my_content/knowledge/` and extra lessons in
  `my_content/lessons/` - see Help → *Adding your own articles and lessons* and
  [`docs/CONTENT_FORMAT.md`](docs/CONTENT_FORMAT.md).
- **Changing the app:** the code is ordinary Python, written to be readable. Start with
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (how it fits together) and
  [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) (how to make common changes safely, run the automated tests, and
  add database migrations). By the end of Python Level 9 you will understand all of it.
- **Checking your changes:** run the automated tests. In a terminal in the app folder:
  - Windows: `.venv\Scripts\python -m pip install -r requirements-dev.txt` (once), then
    `.venv\Scripts\python -m pytest`
  - Mac/Linux: `.venv/bin/python -m pip install -r requirements-dev.txt` then `.venv/bin/python -m pytest`
- **Project state:** [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) lists what is finished, tested,
  unfinished and known limitations, with next steps - written so any developer or AI assistant can continue.

---

## 16. What is in this folder

| Path | Purpose |
|---|---|
| `README.md` | This guide |
| `install_windows.bat`, `start_windows.bat` | Install / start on Windows |
| `install_mac_linux.sh`, `start_mac_linux.sh` | Install / start on Mac and Linux |
| `requirements.txt`, `constraints.txt` | The packages the app needs, and their exact tested versions |
| `app.py` | The starting point of the app (sets up the menu) |
| `views/` | One file per page of the app |
| `academy/` | The app's logic: code runner, checker, SQL engine, progress, search, backup, AI |
| `content/` | All lessons, projects, articles, help pages and sample databases (plain text) |
| `my_content/` | Your own lessons and articles (kept during updates) |
| `data/` | **Your progress and files** (created on first start; never delete) |
| `backups/` | Backup .zip files (created when you make the first backup) |
| `docs/` | Status, architecture, maintenance, content format, troubleshooting |
| `tests/` | Automated tests that check the app and every exercise |
| `tools/` | Developer tools (regenerating the sample databases) |
| `.streamlit/config.toml` | Settings for the interface (keeps the app private to your computer) |
| `.venv/` | The app's private Python packages (created by the installer) |
