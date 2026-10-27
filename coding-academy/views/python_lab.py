"""Python Practice Lab: free coding, all exercises in one place, and your practice folder."""

import streamlit as st

from academy import paths, personal
from academy.ai.providers import current_config
from academy.python_runner import clear_sandbox, list_sandbox_files, run_python
from academy.ui.common import get_library, page_link, python_timeout
from academy.ui.exercises import EDITOR_HELP, render_python_exercise, show_completion_message, show_run_result

library = get_library()
st.title("🐍 Python Practice Lab")
st.markdown("Write and run real Python code. Your programs run on your own computer in a separate, "
            "time-limited process inside your **practice folder**.")
show_completion_message()

WELCOME_CODE = '''# Welcome to the Python Lab!
# Lines starting with # are comments: Python ignores them.
# Press "Run" to run this program, then change it and run it again.

name = "learner"
print("Hello,", name)
print("2 + 3 =", 2 + 3)
'''

free, exercises, folder, safety = st.tabs(["✏️ Free coding", "🎯 Exercises", "📁 Practice folder",
                                           "🛡️ How the lab keeps you safe"], key="python_lab_tabs")


def _load_file() -> None:
    choice = st.session_state.get("lab_file_choice")
    if choice and choice != "(new file)":
        saved = personal.get_lab_file("python", choice)
        if saved:
            st.session_state["code_py_lab"] = saved["code"]
            st.session_state["lab_file_name"] = saved["name"]
    else:
        st.session_state["code_py_lab"] = WELCOME_CODE
        st.session_state["lab_file_name"] = ""
    st.session_state.pop("lab_result", None)


requested = st.query_params.get("file")
if requested and st.session_state.get("_lab_loaded_query") != requested:
    saved = personal.get_lab_file("python", requested)
    if saved:
        st.session_state["code_py_lab"] = saved["code"]
        st.session_state["lab_file_name"] = saved["name"]
        st.session_state["lab_file_choice"] = saved["name"]
    st.session_state["_lab_loaded_query"] = requested

st.session_state.setdefault("code_py_lab", WELCOME_CODE)
st.session_state.setdefault("lab_file_name", "")
if "_pending_choice" in st.session_state:  # set by Save/Delete before the menu is drawn
    st.session_state["lab_file_choice"] = st.session_state.pop("_pending_choice")


def _clear_practice_folder() -> None:
    st.session_state["_cleared_count"] = clear_sandbox()
    st.session_state["confirm_clear_sandbox"] = False


with free:
    files = personal.list_lab_files("python")
    names = ["(new file)"] + [f["name"] for f in files]
    if st.session_state.get("lab_file_choice") not in names:
        st.session_state["lab_file_choice"] = "(new file)"
    top_left, top_right = st.columns([2, 2])
    with top_left:
        st.selectbox("Open a saved program", names, key="lab_file_choice", on_change=_load_file,
                     help="Programs you save here are stored in your progress database and included in backups.")
    with top_right:
        st.text_input("Program name (for saving)", key="lab_file_name", placeholder="e.g. my calculator")

    code = st.text_area("Your code", key="code_py_lab", height=320, help=EDITOR_HELP)
    stdin = ""
    if "input(" in (code or ""):
        stdin = st.text_area("Input for your program - one answer per line (used by `input()`)",
                             key="lab_stdin", height=90)

    with st.container(horizontal=True):
        run_clicked = st.button("▶ Run", type="primary", key="lab_run")
        save_clicked = st.button("💾 Save", key="lab_save")
        st.button("📄 New", key="lab_new", on_click=lambda: (st.session_state.update(lab_file_choice="(new file)"),
                                                             _load_file()))
        delete_clicked = st.button("🗑️ Delete saved program", key="lab_delete",
                                   disabled=st.session_state.get("lab_file_choice") == "(new file)")

    if save_clicked:
        name = (st.session_state.get("lab_file_name") or "").strip()
        if not name:
            st.warning("Type a program name first, then press Save.")
        else:
            saved_name = personal.save_lab_file("python", name, code or "")
            st.session_state["_pending_choice"] = saved_name
            st.toast(f"Saved '{saved_name}'")
            st.rerun()
    if delete_clicked:
        st.session_state["_confirm_delete"] = st.session_state.get("lab_file_choice")
    pending = st.session_state.get("_confirm_delete")
    if pending and pending != "(new file)":
        st.warning(f"Delete the saved program **{pending}**? This cannot be undone (unless you restore a backup).")
        yes, no = st.columns(2)
        if yes.button("Yes, delete it", key="lab_delete_yes"):
            personal.delete_lab_file("python", pending)
            st.session_state.pop("_confirm_delete", None)
            st.session_state["_pending_choice"] = "(new file)"
            st.rerun()
        if no.button("No, keep it", key="lab_delete_no"):
            st.session_state.pop("_confirm_delete", None)
            st.rerun()

    if run_clicked:
        with st.spinner("Running..."):
            st.session_state["lab_result"] = run_python(code or "", stdin, timeout=python_timeout())
    result = st.session_state.get("lab_result")
    if result:
        with st.container(border=True):
            show_run_result(result)
        if (result.error or result.timed_out) and current_config().enabled:
            page_link("ai_tutor", "Ask the AI tutor to explain this error", icon="🤖", explain="python_lab")

with exercises:
    lessons = [ls for ls in library.track_lessons("python") if any(not e.is_manual for e in ls.exercises)]
    if not lessons:
        st.info("No Python exercises found.")
    else:
        lesson = st.selectbox("Lesson", lessons, format_func=lambda ls: f"Level {ls.level} · {ls.title}",
                              key="lab_ex_lesson")
        options = [e for e in lesson.exercises if not e.is_manual]
        exercise = st.selectbox("Exercise", options,
                                format_func=lambda e: f"{e.title} ({e.difficulty})", key="lab_ex_choice")
        with st.container(border=True):
            render_python_exercise(exercise, library)

with folder:
    st.markdown(f"Programs run inside this folder on your computer:  \n`{paths.SANDBOX_DIR}`")
    st.caption("When a lesson asks you to create or read files, they appear here. Your programs may only "
               "create, change or delete files inside this folder.")
    sandbox_files = list_sandbox_files()
    if not sandbox_files:
        st.info("The practice folder is empty. Programs that write files will put them here.")
    for file in sandbox_files:
        rel = file.relative_to(paths.SANDBOX_DIR)
        size = file.stat().st_size
        with st.expander(f"📄 {rel}  ({size:,} bytes)"):
            data = file.read_bytes()
            if size <= 200_000:
                try:
                    st.code(data.decode("utf-8"), language="text")
                except UnicodeDecodeError:
                    st.caption("This file is not plain text.")
            st.download_button("Download", data, file_name=file.name, key=f"dl_{rel}")
    if "_cleared_count" in st.session_state:
        st.success(f"Deleted {st.session_state.pop('_cleared_count')} file(s).")
    if sandbox_files:
        if st.checkbox("I want to delete ALL files in my practice folder", key="confirm_clear_sandbox"):
            st.button("🗑️ Delete all practice files", type="primary", on_click=_clear_practice_folder)

with safety:
    st.markdown("""
**Your code never runs inside the app itself.** Each time you press *Run* or *Check*, the app starts a
separate Python process with these safety rules:

- ⏱️ **Time limit** - programs are stopped after the limit set in *Settings* (default 10 seconds). This
  protects you from loops that never end.
- 📏 **Output limit** - a program that prints endlessly is stopped.
- 📁 **Practice folder only** - creating, changing, renaming or deleting files is only allowed inside your
  practice folder. Reading files elsewhere is allowed.
- 🚫 **No starting other programs** - commands like `os.system(...)` or `subprocess` are blocked.
- 🧠 **Memory and processor limits** - on Linux and macOS. *On Windows only the time limit applies.*

**Honest limitation:** these rules are a safety net against *accidents*, not a high-security wall. Code
deliberately written to get around them could succeed. So: only run code you understand, and never paste
code from people you do not trust. Code that uses the internet (lesson *APIs and HTTP*) can still reach the
internet.
""")
