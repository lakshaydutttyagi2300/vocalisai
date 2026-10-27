"""Settings: your name, practice limits, pass mark, backups, and a careful 'start over' option."""

import sqlite3
import sys
from pathlib import Path

import streamlit as st

from academy import APP_VERSION, backup, db, paths, progress
from academy.ui.common import get_library, page_link, show_content_problems

settings = db.get_all_settings()
st.title("⚙️ Settings")

with st.form("settings_form"):
    st.subheader("You")
    name = st.text_input("Your first name (used in greetings)", value=settings["learner_name"])

    st.subheader("Practice")
    timeout = st.slider("Python time limit (seconds)", 2, 60, int(float(settings["python_timeout"] or 10)),
                        help="Programs running longer than this are stopped. Increase it only if a correct "
                             "program needs more time.")
    pass_mark = st.slider("Quiz pass mark (%)", 50, 100, int(settings["quiz_pass_percent"] or 70), step=5,
                          help="The score needed in a lesson quiz to complete the lesson.")

    st.subheader("Backups")
    backup_dir = st.text_input(
        "Backup folder (leave empty for the default)", value=settings["backup_dir"],
        placeholder=str(paths.DEFAULT_BACKUP_DIR),
        help="Tip: choose a folder inside your Google Drive folder (if you use Google Drive for desktop) - then "
             "every backup is copied to Google Drive automatically. Example on Windows: G:\\My Drive\\CodingAcademyBackups")
    auto_days = st.number_input("Make an automatic backup every ... days (0 = never)", 0, 60,
                                int(settings["auto_backup_days"] or 7))
    keep = st.number_input("Keep this many automatic backups", 1, 100, int(settings["auto_backup_keep"] or 10))
    submitted = st.form_submit_button("💾 Save settings", type="primary")

if submitted:
    problem = None
    if backup_dir.strip():
        folder = Path(backup_dir.strip()).expanduser()
        try:
            folder.mkdir(parents=True, exist_ok=True)
            test = folder / ".write-test"
            test.write_text("ok", encoding="utf-8")
            test.unlink()
        except OSError as exc:
            problem = f"The backup folder cannot be used ({exc}). Check the path and try again."
    if problem:
        st.error(problem)
    else:
        db.set_setting("learner_name", name.strip())
        db.set_setting("python_timeout", timeout)
        db.set_setting("quiz_pass_percent", pass_mark)
        db.set_setting("backup_dir", backup_dir.strip())
        db.set_setting("auto_backup_days", auto_days)
        db.set_setting("auto_backup_keep", keep)
        st.success("Settings saved.")

st.subheader("🤖 AI tutor")
st.markdown("The AI tutor is optional and switched off by default. Set it up on its own page.")
page_link("ai_tutor", "Open AI Tutor settings", icon="🤖")

st.subheader("📁 Where your data is")
st.markdown(f"""
- **Your progress, notes, bookmarks, saved programs, settings:** `{paths.DB_PATH}`
- **Files created by your practice programs:** `{paths.SANDBOX_DIR}`
- **SQL practice databases (can be reset any time):** `{paths.PRACTICE_DB_DIR}`
- **Your own extra lessons and articles:** `{paths.MY_CONTENT_DIR}`
- **Backups:** `{backup.backup_dir()}`
- **AI keys (only if you added one; never included in backups):** `{paths.SECRETS_PATH}`
""")

st.subheader("ℹ️ About this app")
st.markdown(f"""
- App version: **{APP_VERSION}** · Progress database structure version: **{db.SCHEMA_VERSION}**
- Python **{sys.version.split()[0]}** · SQLite **{sqlite3.sqlite_version}** · Streamlit **{st.__version__}**
- App folder: `{paths.APP_DIR}`
""")
show_content_problems(get_library())

st.subheader("⚠️ Start over")
with st.expander("Reset all learning progress"):
    st.markdown("This deletes your lesson progress, exercise attempts, quiz results, reviews and project ticks. "
                "Your **notes, bookmarks, saved programs and settings are kept**. A backup is made automatically "
                "first, so you can undo this from *Backup & Restore*.")
    typed = st.text_input("Type RESET (in capitals) to confirm")
    if st.button("Reset my progress", disabled=typed != "RESET"):
        saved = backup.create_backup("before-reset")
        progress.reset_all_progress()
        st.success(f"Progress reset. A backup of the previous state was saved as {saved.name}.")
