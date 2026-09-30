# Media sources

Every image, video, font and piece of teaching content shown to visitors, and
where it came from. Add a row whenever you add media.

## Videos and posters (`public/media/`)

| File | What it shows | Source |
| --- | --- | --- |
| `speech-analysis.webm` / `.jpg` | Scrolling through a speech analysis result | Our own screen recording of VocalisAi, made with Playwright against a local production build and the test database. The answer and ratings are an example written for the clip (captioned "example recording") — not a real candidate |
| `practice-question.webm` / `.jpg` | Answering two grammar practice questions with feedback | Our own screen recording (same method), real questions from our question bank |

Clips are silent, 20–40 s, 800×450, loaded only when a visitor presses play.
To re-record after a UI change, write a short Playwright script that signs in a
throwaway test user on the test database, drives the page with
`recordVideo`, saves a poster with `page.screenshot({ type: "jpeg" })`, and
deletes the user afterwards. Record against `npm run build` +
`E2E_SERVER=start` so the development badge doesn't appear.

## Images

None. The landing page uses live product UI (`HeroAnalysis`, the waveform in
the feedback tile) instead of photos. No stock photography is used.

## Fonts

Sora, Public Sans and IBM Plex Mono via `next/font/google` (SIL Open Font
License, self-hosted at build time).

## Icons

`lucide-react` (ISC licence), through `src/components/ui/Icon.tsx`.

## Written content

The micro-lessons on the landing page (`LESSONS` in `src/app/page.tsx`) and
the example analysis in `HeroAnalysis` were written for VocalisAi. Exam names
in the exam library are described as "-style" practice with a
not-affiliated notice; no exam body's logos are used.
