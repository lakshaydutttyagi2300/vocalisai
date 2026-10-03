# Media sources

Every image, video, font and piece of teaching content shown to visitors, and
where it came from. Add a row whenever you add media.

## Clips and posters (`public/media/cine/`)

Free stock footage from [Pexels](https://www.pexels.com/license/): free for
commercial use, no attribution required, and the people in it must not be
presented as endorsing us. Captions always describe what VocalisAi does, never
the people (they are not our users, and nothing claims they are).

Each clip is a **seamless 6-second loop** made with ffmpeg (October 2026): 6.7 s
taken from the source, the last 0.7 s cross-faded into the first 0.7 s so the
loop point can't be seen, one gentle warm grade for every clip, no audio. Two
sizes: `<name>-1280.mp4` (desktop, ~0.3-1.1 MB) and `<name>-640.mp4` (phones,
~0.1-0.35 MB), H.264 with a keyframe every second and `+faststart`, plus
posters from the loop's first frame: `<name>.webp` and `<name>-640.webp`.
Checked with ffmpeg `freezedetect`/`blackdetect`: no frozen or black frames.
(The earlier hero clips were recorded in the browser; their missing timing data
made each loop stall for about a second. They were replaced.)

| Name | Shows | Pexels video | By |
| --- | --- | --- | --- |
| `mic-hero` | A woman speaking into a studio microphone | 27153538 | Nino Souza |
| `interviewer` | An interviewer on a laptop screen | 8512946 | Artem Podrez |
| `studio` | A woman at a studio microphone, warm light | 7086278 | cottonbro studio |
| `agent` | A customer-service agent with a headset | 7682757 | Mikhail Nilov |
| `reading-mic` | A woman with headphones reading into a mic | 4540151 | Kaboompics |
| `videocall` | A woman talking on a video call | 8993403 | Hanna Pad |
| `headphones` | A man with headphones speaking and reading | 6671228 | Tima Miroshnichenko |
| `mic-macro` | A microphone close-up | 39118276 | Media Hopper Studio |
| `meeting` | A man in an online meeting, on a laptop | 7643346 | MART PRODUCTION |
| `portrait` | A woman speaking to camera | 8048249 | Antoni Shkraba |
| `graduates` | Graduates in caps and gowns | 8060941 | olia danilevich |
| `callcentre` | A call-centre agent with a headset | 7706876 | MART PRODUCTION |
| `teacher` | A teacher with a student | 6672045 | Andy Barbour |
| `podcast-bokeh` | A podcast microphone in soft focus | 7586494 | Los Muertos Crew |
| `presenting` | A woman presenting with a microphone | 8716788 | Pavel Danilyuk |
| `office` | Young professionals in a modern office | 5944692 | Theo Decker |
| `interview` | A woman in a job interview | 7426752 | Pavel Danilyuk |

**To add or replace a clip:** download it from Pexels (ask the owner first), then
run the same ffmpeg recipe (the filter graph is: trim D+X seconds, split, blend
the tail into the head with `blend=all_expr='A*(1-T/X)+B*(T/X)'`, concat with
the body; `libx264 -crf 27 -g 25 -movflags +faststart`). Keep the
`<name>-1280.mp4 / -640.mp4 / .webp / -640.webp` names; components find clips by
name (`src/components/cine/media.ts`). ffmpeg is a local tool only; it is not a
project dependency.

**How the site plays them:** `CineVideo` shows the poster first, loads the clip
only near the screen, plays it only while visible (or on hover, where a mouse
exists), and never loads clips with reduced motion or Save-Data. `CineHero`
loads the first clip after the page has loaded, the next one half-way through
the current slide, and hands over just before the loop point.

## Product demos

The animated demos (`src/components/cine/demos.tsx`: speech analysis, AI
interview, choose-answer-review walkthrough) are built from HTML, not
recordings, and every one is labelled "Example". Their sample answers and
scores were written for VocalisAi.

## Fonts

Inter Tight (headlines), Inter (text), Instrument Serif (one accent word per
big headline) and IBM Plex Mono (numbers), via `next/font/google` (SIL Open Font
License, self-hosted at build time).

## Icons

`lucide-react` (ISC licence), through `src/components/ui/Icon.tsx`.

## Written content

Page copy, the micro-lessons (`LESSONS` in `src/components/cine/content.tsx`)
and the demo examples were written for VocalisAi. No testimonials, customer
logos or invented figures; the homepage figures come from the live database.
Exam and company names are described as practice in the style of those tests,
with a not-affiliated notice.
