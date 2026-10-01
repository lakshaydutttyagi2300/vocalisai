# Media sources

Every image, video, font and piece of teaching content shown to visitors, and
where it came from. Add a row whenever you add media.

## Videos and posters (`public/media/`)

| File | What it shows | Source |
| --- | --- | --- |
| `speech-analysis.webm` / `.jpg` | Scrolling through a speech analysis result | Our own screen recording of VocalisAi, made with Playwright against a local production build and the test database. The answer and ratings are an example written for the clip (captioned "example recording") — not a real candidate |
| `practice-question.webm` / `.jpg` | Answering two grammar practice questions with feedback | Our own screen recording (same method), real questions from our question bank |

Clips are silent, 20–40 s, 800×450, loaded only when a visitor presses play.

### Landing hero clips (`public/media/hero/`)

Free stock footage from [Pexels](https://www.pexels.com/license/) (free for commercial use, no attribution required; people must not be shown as endorsing us). Each was trimmed to a silent 5-second loop at 960 px and re-encoded (WebM VP9 + MP4 H.264, ~200–340 KB) with a poster from its first frame (`.webp`, ~25 KB). The hero captions describe VocalisAi features, not the people. `celebrate.webp` is also the picture in the sign-in panel (`AuthShell`).

| File | Shows | Pexels video | By |
| --- | --- | --- | --- |
| `presenting` | A woman presenting with a microphone | 8716788 | Pavel Danilyuk |
| `office` | Young professionals working in a modern office | 5944692 | Theo Decker |
| `interview` | A woman in a job interview | 7426752 | Pavel Danilyuk |
| `offer` | A smiling man at a desk, across a handshake | 6930831 | Mikhail Nilov |
| `celebrate` | Colleagues high-fiving in an office | 8865709 | Yan Krukau |

To replace one: download the clip from Pexels, then trim/encode it with a
Playwright script that plays it into a canvas and records 5 s with
`MediaRecorder` (VP9 and `video/mp4;codecs=avc1.42E01E`), as no ffmpeg is
needed; keep the same file names.
To re-record after a UI change, write a short Playwright script that signs in a
throwaway test user on the test database, drives the page with
`recordVideo`, saves a poster with `page.screenshot({ type: "jpeg" })`, and
deletes the user afterwards. Record against `npm run build` +
`E2E_SERVER=start` so the development badge doesn't appear.

## Images

Only the hero posters above. The rest of the landing page uses live product UI
(`HeroAnalysis`, the waveform in the feedback tile).

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
