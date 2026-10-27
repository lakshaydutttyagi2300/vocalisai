---
id: offline-and-costs
title: Working offline, and what (if anything) costs money
category: Help
order: 4
---

# Offline use and costs

## Works completely offline (after installation)

- All lessons, exercises, hints, solutions, quizzes and explanations
- The Python Practice Lab and SQL Practice Lab
- Automatic checking of answers and the error explanations
- Progress tracking, mastery estimates and revision scheduling
- Knowledge Base search
- Notes and bookmarks
- Backups to a folder on your computer, and restoring them
- Projects

Nothing is sent to the internet. The app does not collect usage statistics.

## Needs the internet

| Feature | Why |
|---|---|
| Installing the app (once) | Downloads Python packages |
| Updating the app (optional) | Downloads the new version |
| AI tutor with Claude or another cloud service (optional) | The AI runs on the provider's computers |
| AI tutor with Ollama/LM Studio | Only to download the model once; afterwards offline |
| Google Drive copies of backups (optional) | Google Drive uploads the files |
| Python lessons/projects about web APIs | Those programs fetch data from the internet - offline alternatives are provided |

## Costs

- **The app:** free. All its components (Python, Streamlit, SQLite) are free and open source.
- **Claude subscription:** not needed. The app does not use your claude.ai subscription at all.
- **AI tutor with Claude:** optional and **paid per use** through a separate Anthropic API account
  (console.anthropic.com). Prices are listed on the AI Tutor page.
- **AI tutor with Ollama or LM Studio:** free; uses your own computer's power.
- **Google Drive:** your existing storage. Backups are small (usually under 1 MB).
