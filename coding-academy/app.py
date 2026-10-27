"""My Personal Coding Academy - start here.

Run with:   streamlit run app.py
(or double-click start_windows.bat / start_mac_linux.sh)

This file sets up the page, prepares your data folder, and builds the
navigation menu. Each menu entry is a file in the views/ folder.
"""

import streamlit as st

from academy import APP_NAME
from academy.ui import common

st.set_page_config(page_title=APP_NAME, page_icon="🎓", layout="wide", initial_sidebar_state="auto")

startup_info = common.startup()
common.inject_styles()


def page(file: str, title: str, icon: str, name: str, default: bool = False) -> st.Page:
    created = st.Page(f"views/{file}", title=title, icon=icon, url_path=name, default=default)
    common.PAGES[name] = created
    return created


navigation = st.navigation({
    "Learn": [
        page("home.py", "Home", ":material/home:", "home", default=True),
        page("python_academy.py", "Python Academy", ":material/code:", "python_academy"),
        page("sql_academy.py", "SQL Academy", ":material/database:", "sql_academy"),
        page("projects.py", "Projects & Challenges", ":material/construction:", "projects"),
    ],
    "Practise": [
        page("python_lab.py", "Python Practice Lab", ":material/terminal:", "python_lab"),
        page("sql_lab.py", "SQL Practice Lab", ":material/table_view:", "sql_lab"),
        page("quizzes.py", "Quizzes & Assessments", ":material/quiz:", "quizzes"),
    ],
    "Review": [
        page("progress.py", "Progress & Revision", ":material/insights:", "progress"),
        page("knowledge_base.py", "Knowledge Base", ":material/menu_book:", "knowledge"),
        page("notes.py", "Notes & Bookmarks", ":material/bookmarks:", "notes"),
    ],
    "Tools & help": [
        page("ai_tutor.py", "AI Tutor (optional)", ":material/smart_toy:", "ai_tutor"),
        page("backup.py", "Backup & Restore", ":material/backup:", "backup"),
        page("settings.py", "Settings", ":material/settings:", "settings"),
        page("help.py", "Help & Troubleshooting", ":material/help:", "help"),
    ],
}, expanded=True)

with st.sidebar:
    st.caption(f"🎓 {APP_NAME}")
    if startup_info.get("auto_backup"):
        st.caption("✅ Automatic backup made this session.")
    if startup_info.get("auto_backup_error"):
        st.caption(f"⚠️ Automatic backup failed: {startup_info['auto_backup_error']}")

navigation.run()
