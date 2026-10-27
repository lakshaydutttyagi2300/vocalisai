"""Projects and practical challenges: bigger tasks that combine several lessons."""

import streamlit as st

from academy import personal
from academy.content import TRACK_NAMES, split_project_body
from academy.ui.common import PAGES, get_library, lesson_link, page_link

library = get_library()
projects = sorted(library.projects.values(), key=lambda p: (p.track, p.order, p.title))
project_id = st.query_params.get("project")
project = library.projects.get(project_id) if project_id else None

if project is None:
    st.title("🛠️ Projects & Practical Challenges")
    st.markdown("Projects are where lessons turn into skills. Each project has **stages**: finish the Beginner "
                "and Intermediate stages to complete it, then try the Extension ideas if you want more. "
                "Projects are *self-assessed*: you tick off each task when your program or query does it.")
    if project_id:
        st.error("That project could not be found.")
    done_ids = personal.completed_projects()
    for track in ("python", "sql"):
        st.subheader(f"{'🐍' if track == 'python' else '🗄️'} {TRACK_NAMES[track]} projects")
        track_projects = [p for p in projects if p.track == track]
        if not track_projects:
            st.caption("No projects yet.")
        for item in track_projects:
            status = personal.project_status(item)
            with st.container(border=True):
                badge = "🏁 Completed" if item.id in done_ids else (
                    f"{status['done_count']}/{status['total']} tasks done" if status["done_count"] else "Not started")
                internet = " · 🌐 needs internet for one stage" if item.internet else ""
                st.markdown(f"**{item.title}** · {item.difficulty.capitalize()} · {badge}{internet}  \n{item.summary}")
                st.page_link(PAGES["projects"], label="Open project", icon="📂", query_params={"project": item.id})
    st.stop()

# ---------------------------------------------------------------- one project
status = personal.project_status(project)
st.page_link(PAGES["projects"], label="All projects", icon="⬅️")
st.title(f"🛠️ {project.title}")
st.markdown(f":gray-badge[{TRACK_NAMES.get(project.track, project.track)}] "
            f":gray-badge[{project.difficulty.capitalize()}]" +
            (" :orange-badge[🌐 One stage needs internet]" if project.internet else ""))
st.markdown(f"*{project.summary}*")

if project.skills:
    with st.expander("Skills used (lessons to revisit if you get stuck)"):
        for lesson_id in project.skills:
            lesson = library.lessons.get(lesson_id)
            if lesson:
                lesson_link(lesson, icon="📖")

for title, text in split_project_body(project.body):
    if title.lower().startswith("hints"):
        with st.expander("💡 Hints - open only when you're stuck"):
            st.markdown(text)
    elif title.lower().startswith("sample solution"):
        with st.expander("🔑 Sample solution - try it on your own first"):
            st.caption("This is one possible solution. Yours can look different and still be right - "
                       "compare ideas, not exact text.")
            st.markdown(text)
    else:
        st.markdown((f"## {title}\n\n" if title else "") + text)

if project.starter and project.track == "python":
    if st.button("📝 Open the starter code in the Python Lab", type="primary"):
        name = f"Project - {project.title}"
        if personal.get_lab_file("python", name) is None:
            personal.save_lab_file("python", name, project.starter)
        st.switch_page(PAGES["python_lab"], query_params={"file": name})
if project.track == "sql" and project.dataset:
    page_link("sql_lab", f"Open the '{project.dataset}' database in the SQL Lab", icon="🗄️", dataset=project.dataset)

st.subheader("✅ Tasks")
for stage in project.stages:
    st.markdown(f"#### {stage.name}" + ("" if stage.required else " *(optional)*"))
    if stage.description:
        st.markdown(stage.description)
    for task in stage.tasks:
        key = f"task_{project.id}_{task.id}"
        checked = task.id in status["done"]
        value = st.checkbox(task.text, value=checked, key=key)
        if value != checked:
            personal.set_project_task(project.id, task.id, value)
            st.rerun()

st.subheader("🏁 Finish the project")
reflection = st.text_area("Reflection (optional): what did you learn? What was hard? What would you improve?",
                          value=status["reflection"], key=f"reflect_{project.id}")
col1, col2 = st.columns(2)
if col1.button("Save reflection"):
    personal.save_project_reflection(project.id, reflection)
    st.toast("Saved")
if status["completed_at"]:
    st.success(f"Completed on {status['completed_at'][:10]}. 🎉")
    if col2.button("Mark as not completed"):
        personal.set_project_completed(project.id, False, reflection)
        st.rerun()
elif status["required_done"]:
    if col2.button("🏁 Mark project as completed", type="primary"):
        personal.set_project_completed(project.id, True, reflection)
        st.balloons()
        st.rerun()
else:
    col2.caption("Tick all Beginner and Intermediate tasks to complete the project.")
