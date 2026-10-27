"""Personal notes and bookmarks."""

import streamlit as st

from academy import personal
from academy.ui.common import PAGES, get_library

library = get_library()
st.title("🗒️ Notes & Bookmarks")

notes_tab, bookmarks_tab = st.tabs(["🗒️ My notes", "★ Bookmarks"], key="notes_tabs")

lesson_options = [""] + [ls.id for ls in library.all_lessons()]


def lesson_label(lesson_id: str) -> str:
    if not lesson_id:
        return "(not linked to a lesson)"
    lesson = library.lessons.get(lesson_id)
    return f"{lesson.track.upper()} L{lesson.level} · {lesson.title}" if lesson else lesson_id


with notes_tab:
    st.caption("Notes are stored in your progress database (included in backups). Writing ideas in your own "
               "words is one of the best ways to remember them. You can use Markdown formatting, e.g. "
               "`**bold**` and `` `code` ``.")
    requested = st.query_params.get("note")
    editing_id = st.session_state.get("editing_note")
    if requested and st.session_state.get("_note_query_done") != requested:
        st.session_state["editing_note"] = editing_id = int(requested) if requested.isdigit() else None
        st.session_state["_note_query_done"] = requested

    if editing_id is not None:
        note = personal.get_note(editing_id) if editing_id else None
        heading = "Edit note" if note else "New note"
        with st.form("note_editor"):
            st.markdown(f"**{heading}**")
            title = st.text_input("Title", value=note["title"] if note else "")
            body = st.text_area("Text", value=note["body"] if note else "", height=220)
            lesson_id = st.selectbox("Linked lesson", lesson_options, format_func=lesson_label,
                                     index=lesson_options.index(note["lesson_id"]) if note and
                                     note["lesson_id"] in lesson_options else 0)
            tags = st.text_input("Tags (separate with commas)", value=note["tags"] if note else "",
                                 placeholder="e.g. loops, important")
            save, cancel = st.columns(2)
            saved = save.form_submit_button("💾 Save", type="primary")
            cancelled = cancel.form_submit_button("Cancel")
        if saved:
            personal.save_note(title, body, lesson_id or None, tags, note["id"] if note else None)
            st.session_state["editing_note"] = None
            st.toast("Note saved")
            st.rerun()
        if cancelled:
            st.session_state["editing_note"] = None
            st.rerun()
        if note:
            with st.popover("🗑️ Delete this note"):
                st.write("Delete this note permanently?")
                if st.button("Yes, delete", type="primary"):
                    personal.delete_note(note["id"])
                    st.session_state["editing_note"] = None
                    st.rerun()
    else:
        top1, top2, top3 = st.columns([2, 1, 1])
        search = top1.text_input("Filter notes", placeholder="Search your notes", label_visibility="collapsed")
        if top2.button("➕ New note", type="primary"):
            st.session_state["editing_note"] = 0
            st.rerun()
        notes = personal.list_notes(search=search)
        if notes:
            top3.download_button("⬇️ Export all (Markdown)", personal.notes_as_markdown_zip(),
                                 file_name="my-coding-academy-notes.zip", mime="application/zip")
        tags = personal.all_tags()
        chosen = st.pills("Filter by tag", tags, selection_mode="multi", key="note_tags") if tags else []
        if chosen:
            notes = [n for n in notes if set(chosen) <= {t.strip() for t in n["tags"].split(",")}]
        if not notes:
            st.info("No notes yet. Add one with **New note**, or from the *Revise & next* tab of any lesson.")
        for note in notes:
            with st.container(border=True):
                st.markdown(f"**{note['title']}**")
                if note["body"]:
                    st.markdown(note["body"])
                details = [f"Updated {note['updated_at'].replace('T', ' ')}"]
                if note["lesson_id"]:
                    details.append(f"Lesson: {lesson_label(note['lesson_id'])}")
                if note["tags"]:
                    details.append(f"Tags: {note['tags']}")
                st.caption(" · ".join(details))
                if st.button("✏️ Edit", key=f"edit_{note['id']}"):
                    st.session_state["editing_note"] = note["id"]
                    st.rerun()

with bookmarks_tab:
    bookmarks = personal.list_bookmarks()
    if not bookmarks:
        st.info("No bookmarks yet. Use the ☆ Bookmark button on any lesson or knowledge-base article.")
    for mark in bookmarks:
        with st.container(border=True, horizontal=True, vertical_alignment="center"):
            if mark["item_type"] == "lesson" and mark["item_id"] in library.lessons:
                lesson = library.lessons[mark["item_id"]]
                page = PAGES["python_academy" if lesson.track == "python" else "sql_academy"]
                st.page_link(page, label=lesson.title, icon="📖", query_params={"lesson": lesson.id})
            elif mark["item_type"] == "article" and mark["item_id"] in library.articles:
                st.page_link(PAGES["knowledge"], label=mark["title"], icon="📄",
                             query_params={"article": mark["item_id"]})
            else:
                st.write(f"{mark['title']} (no longer available)")
            if st.button("Remove", key=f"unbm_{mark['id']}"):
                personal.delete_bookmark(mark["id"])
                st.rerun()
