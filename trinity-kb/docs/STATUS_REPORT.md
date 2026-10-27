# Build status, import report and website coverage report (27 Oct 2026)

## Internal document import report
**No internal documents have been imported yet.** None of the files mentioned in the brief were found in the build
environment: Syllabus.pdf, Q&A.xlsx, FCR_Triage_Directory.docx, the booking guides and the LAR guides.
Import them on your own computer (README → First steps). The **Import report** page then lists every file with its
pages or worksheets, number of passages, status and warnings.

## Website coverage report
**No pages from trinitycollege.com have been collected.** The build environment's network does not allow access to
www.trinitycollege.com, so robots.txt, the sitemap and the terms of use could not be checked from here.
The crawler was tested against a simulated site covering:
- robots.txt rules;
- sitemaps;
- error pages (403, 404, 500);
- duplicate pages;
- resuming an interrupted run;
- detecting changed pages.

Collection stays switched off until you tick the terms-of-use confirmation in Settings.

## Hardware
The build machine (a cloud container) is not your computer, so no model is assumed. Settings → *AI model* (or
`python -m tkb hardware`) inspects **your** computer and recommends a size.

## What remains / possible next stages
- Run the first import and website collection on your computer, then review both reports.
- Optional semantic search with a local embedding model, if keyword search misses wording variations.
- Wording-level contradiction detection (currently only conflicting figures are detected).
