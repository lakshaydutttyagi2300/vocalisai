---
id: adding-content
title: Adding your own articles and lessons
category: Help
order: 5
---

# Adding your own learning material

You can add material without changing any program code. Your files live in the **`my_content`** folder, which
is kept when you update the app and included in backups.

## Add an article (easy)

1. Open the app folder, then `my_content`, then `knowledge`.
2. Create a new text file, e.g. `my-sql-tips.md` (the `.md` ending matters - it means *Markdown*).
   On Windows: right-click → *New* → *Text Document*, then rename it (with file extensions visible - see the
   *Files and folders* lesson).
3. Open it with Notepad (or any text editor) and write, for example:

   ```text
   # My SQL tips

   ## Remember
   - Text needs single quotes.
   - Use IS NULL, never = NULL.
   ```

4. Save. Refresh the app (press F5 in the browser). Your article appears in the **Knowledge Base** under
   *My articles* and is included in search.

**Markdown basics:** `# Title`, `## Section`, `**bold**`, `*italic*`, `- bullet`, `` `code` ``, and code blocks
between lines of three backticks.

## Add a lesson (advanced)

Lessons use the same format as the built-in ones: a header between `---` lines, sections starting with `## `,
and special blocks for exercises and quizzes.

1. Copy a built-in lesson file from `content/python/level-01/` into `my_content/lessons/`.
2. Change the `id:` to something new and unique (e.g. `my-python-extra-1`), and the `title`, `level` and
   `order`.
3. Edit the text, exercises and quiz.
4. Refresh the app. The lesson appears in its track and level.

If something is wrong, a **"content file problem"** message explains what and where. The full format reference
is `docs/CONTENT_FORMAT.md` in the app folder.

## Your notes

For quick personal notes you do not need files at all - use **Notes & Bookmarks**, or the notes area at the
bottom of each lesson's *Revise & next* tab.
