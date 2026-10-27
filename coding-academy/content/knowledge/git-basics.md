---
id: git-basics
title: Git basics - saving the history of your work (optional)
category: Reference
order: 9
tags: [git, github, version control, commit, history, backup]
---

You do **not** need Git to use this app. But as your own programs grow, Git is the professional way to keep
their history. This is a gentle introduction.

## What Git is

**Git** is a *version control system*: a tool that takes snapshots ("commits") of a folder of files whenever you
ask, so you can see what changed, go back to an earlier version, and try ideas without fear. **GitHub** is a
website that stores Git folders ("repositories") online - useful as an off-site copy and for sharing. Git is
free; GitHub has a free plan.

## Install

- Windows: download "Git for Windows" from git-scm.com and accept the default options.
- Mac: open Terminal and type `git --version`; if Git is missing, macOS offers to install it.

Check it worked: `git --version` prints something like `git version 2.47.0`.

## One-time set-up

```text
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

These label your snapshots with your name.

## Everyday commands

Open a terminal **inside the folder** of your project (for example `cd Documents\my-programs`):

| Command | What it does |
|---|---|
| `git init` | Start tracking this folder (once per project) |
| `git status` | Show which files changed since the last snapshot |
| `git add .` | Mark all changed files to be included in the next snapshot |
| `git commit -m "Add calculator"` | Take the snapshot, with a short description |
| `git log --oneline` | List previous snapshots |
| `git diff` | Show exactly what changed (press `q` to leave) |
| `git restore file.py` | Throw away uncommitted changes to a file |

A good rhythm: get something working → `git add .` → `git commit -m "what I did"`.

## Ignoring files

Create a file named `.gitignore` listing things that should never be saved in Git: passwords and API keys,
big data files, the `.venv` folder. This app's own `.gitignore` already excludes your personal `data` folder
and backups.

## Git and this app

- Your **progress** is not stored with Git - use the app's *Backup & Restore* page.
- If you change the app's code yourself (see *Continuing development* in the docs), Git lets you undo mistakes:
  commit before each change.

## Never commit secrets

Never put API keys or passwords into files tracked by Git, especially if the repository is on GitHub. This app
stores AI keys in `data/secrets.json`, which is excluded by `.gitignore`.
