# Media to-do

Every page hero already has real, licensed media (Pexels clips and stills in
`public/media/cine/` and `public/media/stills/`, credits in
`docs/MEDIA_SOURCES.md`). Several pages reuse the same handful of shots, though,
and a few topics have no fitting footage yet. This is the shopping list.

Nothing here is a placeholder on the live site: until a file is added, each
page keeps the media it shows today.

## File rules

| | Videos | Images |
| --- | --- | --- |
| Sizes | 1920 px and 1280 px wide (plus 640 px for phones) | 1920 px and 800 px wide |
| Length | 8-15 s, cut as a seamless loop, no audio | |
| Formats | MP4 (H.264, `+faststart`) **and** WebM (VP9) | WebP (or AVIF) **and** a JPG fallback |
| Weight | 3-4 MB at most for the 1920 version | under 400 KB for the 1920 WebP |
| Poster | A WebP of the first frame (`<name>.webp`, `<name>-640.webp`) | |
| Look | Bright, warm daylight; real people doing the task; nothing dark or moody | |
| Never | Company logos or brand screens, robots, "AI brain" art, staged handshakes | |

Today's clips are 6-second loops at 1280 and 640 px (the 1920 size and 8-15 s
length above are the target for new footage).

Where to put new files: `public/media/heroes/<category>/<name>...` using the
names below, then point the page at them in `src/config/heroMedia.ts` (one
line per file). Free sources with a commercial licence: Pexels, Pixabay,
Unsplash (images). Ask the owner before downloading, and add a row to
`docs/MEDIA_SOURCES.md` for each file.

## By category

| Category (folder) | Used now | Still wanted (search keywords) |
| --- | --- | --- |
| Dashboard (`dashboard/`) | reading-mic, office, graduates clips; teacher still | A learner at a laptop smiling at a result; a phone showing a streak or progress screen (no app logos) |
| Practice (`practice/`) | office, videocall clips; teacher, reading-mic stills | Notebook and pen with handwritten working; a student with headphones doing an online exercise |
| Company assessments (`companies/`) | interviewer, office clips; meeting, callcentre stills | Campus placement hall with candidates at laptops; a recruiter reviewing a test on screen (generic UI only) |
| Quantitative aptitude (`skills/quant/`) | office, headphones clips; teacher, office stills | Hand-written maths in a notebook; calculator and graph paper on a desk |
| Reasoning (`skills/reasoning/`) | teacher, meeting clips; office, teacher stills | Whiteboard with a logic puzzle or flowchart; a person solving a puzzle at a desk |
| English (`skills/english/`) | reading-mic, videocall clips; portrait, headphones stills | Reading a book in a library; a language tutor on a video call |
| Workplace judgement (`skills/sjt/`) | meeting, callcentre clips; presenting, office stills | A small team meeting around a table; a manager and employee in a calm one-to-one |
| Mock exams (`mock-exams/`) | office, headphones clips; meeting, teacher stills | A quiet desk with a laptop and a timer; a candidate in an exam room with a webcam |
| IELTS and study abroad (`ielts/`) | graduates, teacher clips; graduates, reading-mic stills | University campus; a library; airport or travel with a passport; a speaking-test style interview |
| Speech analysis (`speech-analysis/`) | reading-mic, headphones clips; mic-macro, presenting stills | A sound waveform on a laptop screen (generic); someone recording on a phone |
| Progress (`progress/`) | graduates, office clips; presenting, portrait stills | Charts on a laptop screen (generic, no brand); a learner ticking off a study plan |
| AI coach (`ai-coach/`) | videocall, teacher clips; interviewer, portrait stills | A person chatting with an assistant on a laptop or phone (no logos); a mentor giving one-to-one advice |
| Account (`account/`) | portrait still | One calm, bright workspace photo |
| Admin | none (soft gradient by design) | - |
