"""Backup and restore your data."""

from datetime import datetime
from pathlib import Path

import streamlit as st

from academy import backup, db, paths
from academy.ui.common import page_link

st.title("💾 Backup & Restore")
st.markdown("A backup is **one .zip file** holding everything that is yours: progress, quiz results, notes, "
            "bookmarks, saved programs, settings, files from your practice folder and your own lessons. "
            "API keys are never included, so backups are safe to keep in Google Drive.")

folder = backup.backup_dir()
last = db.get_setting("last_backup", "")
st.caption(f"Backup folder: `{folder}`" + (f" · Last backup: {last.replace('T', ' ')}" if last else
                                            " · No backup made yet"))
page_link("settings", "Change the backup folder or automatic backups", icon="⚙️")

make, restore, drive = st.tabs(["Make a backup", "Restore", "☁️ Google Drive"], key="backup_tabs")

with make:
    if st.button("💾 Make a backup now", type="primary"):
        try:
            path = backup.create_backup("manual")
            st.session_state["last_backup_path"] = str(path)
        except OSError as exc:
            st.error(f"The backup could not be written: {exc}. Check the backup folder in Settings.")
    created = st.session_state.get("last_backup_path")
    if created:
        path = Path(created)
        if path.exists():
            st.success(f"Backup saved: `{path}`")
            st.download_button("⬇️ Also download a copy", path.read_bytes(), file_name=path.name,
                               mime="application/zip",
                               help="Saves a copy wherever your browser saves downloads - e.g. to then upload "
                                    "to Google Drive in your browser.")

    backups = backup.list_backups()
    st.markdown(f"#### Backups in the backup folder ({len(backups)})")
    if not backups:
        st.caption("None yet.")
    for item in backups[:30]:
        st.markdown(f"- `{item.path.name}` - {item.created:%Y-%m-%d %H:%M} - {item.size / 1024:.0f} KB "
                    f"- {item.reason}")

with restore:
    st.markdown("Restoring **replaces** your current progress with the backup's. Before restoring, the app "
                "automatically makes a *safety backup* of your current state, so a restore can be undone.")
    backups = backup.list_backups()
    source = None
    choice = st.radio("Restore from", ["A backup in the backup folder", "A backup file I upload"],
                      horizontal=True, key="restore_from")
    if choice == "A backup in the backup folder":
        if backups:
            picked = st.selectbox("Backup", backups, format_func=lambda b: f"{b.created:%Y-%m-%d %H:%M} · "
                                                                            f"{b.reason} · {b.path.name}")
            source = picked.path
        else:
            st.info("No backups in the backup folder.")
    else:
        uploaded = st.file_uploader("Choose a backup .zip file", type=["zip"])
        if uploaded is not None:
            source = uploaded.getvalue()

    if source is not None:
        check = backup.inspect_backup(source)
        if not check.ok:
            st.error(check.message)
        else:
            with st.container(border=True):
                st.markdown("✅ " + check.message)
                created_at = check.manifest.get("created_at", "unknown")
                st.markdown(f"Made on: **{str(created_at).replace('T', ' ')}** · app version "
                            f"{check.manifest.get('app_version', '?')}")
                if check.stats:
                    st.markdown("Contains: " + ", ".join(f"{v} {k}" for k, v in check.stats.items()))
            restore_files = st.checkbox("Also restore practice-folder files and my own lessons/articles", value=True)
            confirm = st.checkbox("I understand this replaces my current progress (a safety backup is made first)")
            if st.button("♻️ Restore this backup", type="primary", disabled=not confirm):
                try:
                    outcome = backup.restore_backup(source, restore_files=restore_files)
                except (ValueError, OSError) as exc:
                    st.error(f"Restore failed: {exc}. Your current data was not changed.")
                else:
                    st.success(f"Restored! Safety backup of your previous state: `{outcome['safety_backup'].name}`. "
                               f"Files restored: {outcome['files']['python_sandbox']} practice file(s), "
                               f"{outcome['files']['my_content']} of your own content file(s).")
                    for key in list(st.session_state.keys()):
                        if key.startswith(("code_", "result_", "hints_shown_", "quizresult_")):
                            del st.session_state[key]
                    st.session_state["_restored_at"] = datetime.now().isoformat()

with drive:
    st.markdown(f"""
**The simple, reliable way (recommended): Google Drive for desktop**

1. Install **Google Drive for desktop** from Google (free with your Google account). It adds a "Google Drive"
   folder to your computer (on Windows usually the drive `G:` → `My Drive`).
2. In that folder, create a folder named `CodingAcademyBackups`.
3. In this app, open **Settings → Backups** and set the backup folder to that folder, for example
   `G:\\My Drive\\CodingAcademyBackups` (Windows) or
   `~/Library/CloudStorage/GoogleDrive-you@gmail.com/My Drive/CodingAcademyBackups` (Mac).
4. Every backup (manual and automatic) is now saved there, and Google Drive uploads it for you.

**Without Google Drive for desktop:** press *Make a backup now*, then *Also download a copy*, and upload that
.zip file at drive.google.com.

**Good habits**
- The app makes an automatic backup every few days when it starts (see Settings).
- Before updating the app, make a manual backup.
- Google Drive is only a *copy*. The app always works from the local files in `{paths.DATA_DIR}` and never
  needs Google Drive to run.

**Restoring on a new computer:** install the app (README), start it once, then use the *Restore* tab and
upload your latest backup from Google Drive.
""")
