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
| `interviewer` | An interviewer on a laptop screen | 8512946 | Artem Podrez |
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
| `presenting` | A woman presenting with a microphone | 8716788 | Pavel Danilyuk |
| `office` | Young professionals in a modern office | 5944692 | Theo Decker |
| `interview` | A woman in a job interview | 7426752 | Pavel Danilyuk |

Every clip also has **WebM (VP9)** versions, `<name>-1280.webm` and
`<name>-640.webm`, made from the MP4s with ffmpeg (`libvpx-vp9 -crf 35/37 -b:v 0`).
Browsers take the WebM first and fall back to the MP4.

The darker clips used by the earlier night-time design (`mic-hero`, `studio`,
`podcast-bokeh`) were removed in the October 2026 light redesign.

### Added 5 October 2026: one scene per place

So that no picture repeats anywhere on the site, 37 more clips and 41 photos
were added (all Pexels, same licence, same warm grade and loop recipe). Every
scene, its Pexels id and the one place it is used are listed in
[MEDIA_INVENTORY.md](MEDIA_INVENTORY.md), generated from
`src/config/mediaLibrary.ts`. A clip and a still made from it are the same
scene, so the stills that were frames of the first clips were removed.

### Stills (`public/media/stills/`)

Photos (not frames of clips), three files each: `<name>.webp` (1600 px wide),
`<name>-800.webp` (phones) and `<name>.jpg` (fallback), with the same warm
grade as the clips.

**To add a picture:** add it to `LIBRARY` in `src/config/mediaLibrary.ts`, give
it exactly one placement in `PLACEMENTS`, then run
`node scripts/media-inventory.mjs`. `tests/unit/media-library.test.ts` fails if a
scene is placed twice, never placed, missing a file, or if a page uses a
picture outside the library.

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
the current slide, and hands over just before the loop point. `MediaHero`
(every app page's hero) works the same way and also never loads video on phones
or slow connections: stills and posters only.

## Picture writing test photos (`public/media/picture-test/`)

Free photos from [Pexels](https://www.pexels.com/license/), downloaded 19 Oct 2026 with the owner's OK: free for commercial use, no attribution required, and the people in them must not be presented as endorsing us. They are only used as practice prompts in the picture writing test (src/lib/picture-writing/prompts.ts); each photo is used for one prompt and nowhere else on the site, so they are not in the hero media library.

Converted with sharp: `<key>.webp` (1200 px wide, quality 78) and `<key>-640.webp` (quality 74), 1.9 MB for all 18.

| Name | Shows | Pexels photo |
| --- | --- | --- |
| `cafe-payment` | A barista taking a payment at a café counter | [3907119](https://www.pexels.com/photo/3907119/) |
| `cafe-menu` | A customer asking about the menu at a café counter | [4921155](https://www.pexels.com/photo/4921155/) |
| `shop-receipt` | A shopkeeper handing a card back to a customer | [8422734](https://www.pexels.com/photo/8422734/) |
| `bakery-counter` | A customer and a staff member at a café counter | [6281429](https://www.pexels.com/photo/6281429/) |
| `flipchart-meeting` | A woman presenting at a flipchart to colleagues | [5324980](https://www.pexels.com/photo/5324980/) |
| `glass-board` | A team behind a glass wall of sticky notes | [9301825](https://www.pexels.com/photo/9301825/) |
| `warehouse-check` | A woman checking a tablet among boxes | [6169659](https://www.pexels.com/photo/6169659/) |
| `van-delivery` | Two people loading a delivery van | [5025667](https://www.pexels.com/photo/5025667/) |
| `clinic-reception` | A clinic receptionist with two visitors | [7108317](https://www.pexels.com/photo/7108317/) |
| `screen-surprise` | A surprised man at his computer in an office | [3755700](https://www.pexels.com/photo/3755700/) |
| `site-plans` | Two workers in hard hats reading papers on site | [1216589](https://www.pexels.com/photo/1216589/) |
| `site-team` | A site team in hard hats around plans | [37198881](https://www.pexels.com/photo/37198881/) |
| `repair-workshop` | A technician repairing a machine in a workshop | [33388380](https://www.pexels.com/photo/33388380/) |
| `doctor-nurse` | A nurse updating a doctor in a corridor | [6129589](https://www.pexels.com/photo/6129589/) |
| `boardroom` | Three people in suits at a conference table | [8133996](https://www.pexels.com/photo/8133996/) |
| `desk-help` | A colleague helping at a computer | [5621960](https://www.pexels.com/photo/5621960/) |
| `loft-meeting` | An older man guiding a team at a table | [3860648](https://www.pexels.com/photo/3860648/) |
| `clinic-chat` | Two women talking in a waiting area | [4266948](https://www.pexels.com/photo/4266948/) |

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
