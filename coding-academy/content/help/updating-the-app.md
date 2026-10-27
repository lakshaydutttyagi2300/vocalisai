---
id: updating-the-app
title: Updating the app without losing your progress
category: Help
order: 6
---

# Updating the app

Your personal data is kept separate from the app's files, so updating is safe if you follow these steps.

## What belongs to you (never delete these)

| Folder | Contains |
|---|---|
| `data` | progress database, practice files, practice databases, AI keys |
| `backups` | your backup .zip files (unless you chose another folder) |
| `my_content` | your own articles and lessons |

Everything else (`academy`, `views`, `content`, `app.py`, scripts...) is app code and lessons that an update
replaces.

## Steps

1. **Make a backup** (Backup & Restore → Make a backup now). Optionally copy it to Google Drive.
2. **Stop the app** (close its terminal window).
3. Rename your current app folder, e.g. `coding-academy` → `coding-academy-old`.
4. Put the new version in a fresh `coding-academy` folder.
5. **Copy** the `data`, `backups` and `my_content` folders from `coding-academy-old` into the new folder.
6. Run the installer again (`install_windows.bat` or `install_mac_linux.sh`) - it installs any new packages.
7. Start the app. If the progress database needs upgrading, the app does it automatically (this is called a
   *migration*) - your data is kept.
8. Check your progress looks right, then you can delete `coding-academy-old`.

## If something goes wrong

Use *Backup & Restore → Restore* with the backup you made in step 1, or go back to the old folder.
