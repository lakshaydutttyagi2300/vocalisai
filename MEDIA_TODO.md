# Media to-do

Since 5 October 2026 every page and section has its own picture: 92 scenes,
each used in exactly one place (see [docs/MEDIA_INVENTORY.md](docs/MEDIA_INVENTORY.md)).
This list is what would make the visuals better still. Nothing here is a gap
on the live site.

## Upgrades worth making

| What | Why | Where it would go |
| --- | --- | --- |
| 1920 px versions and 8-15 s loops of the hero clips | Today's loops are 6 s at 1280 / 640 px; large screens upscale them | Every clip in `public/media/cine/` |
| A campus placement drive in India (candidates queueing, a hall of laptops) | Closer to the people preparing for TCS NQT, Infosys, AMCAT | Company & Hiring Assessments category, Explore |
| An IELTS-style speaking test (examiner and candidate across a desk) | The English & Communication pages show reading and study, not the speaking test itself | English category, Speaking product page |
| A customer-support agent on a call in an Indian BPO office | Matches the BPO goal track | Home use-case card, Use cases page |
| A person chatting with an assistant on a laptop (no logos) | The AI coach page shows a tutor and a video call | AI coach |
| Charts on a laptop with our own product UI | A real VocalisAi screen instead of a generic chart | Progress, Performance |

## File rules

| | Videos | Images |
| --- | --- | --- |
| Sizes | 1920 px and 1280 px wide (plus 640 px for phones) | 1600 px and 800 px wide |
| Length | 8-15 s, cut as a seamless loop, no audio | |
| Formats | MP4 (H.264, `+faststart`) **and** WebM (VP9) | WebP **and** a JPG fallback |
| Weight | 3-4 MB at most for the largest version | under 400 KB for the large WebP |
| Look | Bright, warm daylight; real people doing the task; nothing dark or moody | |
| Never | Company logos or brand screens, robots, "AI brain" art, staged handshakes, children | |

## How to add one

1. Ask the owner before downloading (free sources with a commercial licence: Pexels, Pixabay, Unsplash).
2. Encode with the recipe in `docs/MEDIA_SOURCES.md` into `public/media/cine/` (clips) or `public/media/stills/` (photos).
3. Add the scene to `LIBRARY` in `src/config/mediaLibrary.ts` and give it **one** placement in `PLACEMENTS`. A scene already placed somewhere else can't be reused.
4. Run `node scripts/media-inventory.mjs` and `npx vitest run tests/unit/media-library.test.ts`.
