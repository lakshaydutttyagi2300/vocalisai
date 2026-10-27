---
id: installing-and-starting
title: Installing, starting and stopping the app
category: Help
order: 2
---

# Installing, starting and stopping

The full step-by-step guide with explanations is in the **README.md** file in the app folder. This is the
short version.

## What you need

- A computer with Windows 10/11, macOS or Linux.
- **Python 3.13** from python.org (3.12 also works). Install takes about 5 minutes.
- About 600 MB of free disk space.
- Internet **only** for the one-time installation. After that, the app works offline.

## Install (once)

**Windows**

1. Install Python 3.13 from python.org. On the first installer screen, **tick "Add python.exe to PATH"**.
2. Put the `coding-academy` folder somewhere permanent, e.g. `Documents\coding-academy`.
3. Double-click **`install_windows.bat`**. A black window shows progress; wait for
   *"Installation finished successfully"*. It takes a few minutes.

**Mac / Linux**

1. Install Python 3.13 (python.org installer on Mac; your package manager on Linux).
2. Open Terminal, go into the folder (`cd ~/Documents/coding-academy`) and run `bash install_mac_linux.sh`.

## Start

- **Windows:** double-click **`start_windows.bat`**.
- **Mac/Linux:** run `bash start_mac_linux.sh` in Terminal.

Your web browser opens the app at **http://localhost:8501**. If it does not open by itself, type that address
into your browser. (*localhost* means "this computer" - nothing goes over the internet.)

## Stop

Close the black terminal window, or click into it and press **Ctrl + C**. Closing only the browser tab does not
stop the app.

## Reopen

Start it again the same way. All your progress is still there.

## Tip: a desktop shortcut (Windows)

Right-click `start_windows.bat` → *Send to* → *Desktop (create shortcut)*.
