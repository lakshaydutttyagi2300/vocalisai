# UI design system

The rules behind the candidate-facing pages. October 2026 direction (owner's
brief): a premium, cinematic product site with Apple-like restraint. Near-black
for the public pages, a calm warm-white workspace inside the app, and **one
accent, champagne, used sparingly**. No bright blue, neon, rainbow gradients or
heavy glass. Tokens and classes live in `src/app/globals.css`; fonts in
`src/app/layout.tsx`; icons via `src/components/ui/Icon.tsx`; cinematic
building blocks in `src/components/cine/`. Use these before inventing new styles.

## Two surfaces

| Where | Look |
| --- | --- |
| Public pages: `/`, `/product/*`, `/use-cases`, `/pricing`, `/about`, `/contact`, the sign-in panel, the Explore header band | Wrapped in `.cine`: night background (#0B0B0D), mist text (#F5F5F2 / #A1A1AA), hairlines `white/8%`, clips in rounded frames |
| App pages (dashboard, practice, tests, results, billing, skills) | Warm off-white (#F5F4F0), white sheets, near-black primary buttons, one `.panel-ink` dark accent panel per page |

The site header is dark on every page.

## Colour

| Token | Use |
| --- | --- |
| `night-950 … night-600` | Cinematic backgrounds and surfaces |
| `mist-50 … mist-500` | Text on night |
| `champagne-100 … champagne-500` | The accent: eyebrows, progress, one highlight per view. Never large fills |
| `brand-50 … brand-200` | Warm cream tints (app highlights) |
| `brand-300 … brand-500` | Champagne-bronze for borders, focus rings and bars |
| `brand-600 … brand-900` | Near-black for primary actions, selected states and links on light pages |
| `ink-*`, `slate-*` | Neutral text and warm-neutral greys (no blue cast) |
| `amber-*`, `red-*`, `green-*` | Only for "needs work", right/wrong and scores — never decoration |

## Type

| Role | Class / font | Where |
| --- | --- | --- |
| Display | `.cine-display` (Inter Tight 600, -0.045em) | Hero and big section statements |
| Headline | `.cine-headline` / `.headline` | Section titles, page `h1`s in the app |
| Accent | `.serif-accent` (Instrument Serif italic) | **One word** in a big headline, never more |
| Eyebrow | `.cine-eyebrow` (champagne, 0.2em caps) / `.eyebrow` in the app | A short label above a heading |
| Body | Inter 400–500 | Everything else |
| Numbers | `.num` (Plex Mono, tabular) | Scores, timers, counts |

## Visual storytelling (public pages)

- Every section pairs words with a clip, a picture or a live demo: `MediaSplit`, `ClipFrame`, `PageHero`, `FinalCta` (`src/components/cine/sections.tsx`). Never several text-only sections in a row.
- Each clip must say something about VocalisAi (speaking, interviews, customer calls, tests, learning). No handshakes, robots, circuits or "AI brain" art.
- No clip repeats within a page's sections.
- Product demos are the HTML ones in `demos.tsx`, labelled "Example".

## Buttons

`.btn-primary` (one per view), `.btn-secondary`, `.btn-dark`, `.btn-ghost`, `.btn-danger`; sizes `.btn-sm`, `.btn-lg`. On light pages the primary button is near-black; inside `.cine` and `.panel-ink` it turns into a light pill (champagne on hover) and secondary buttons go translucent automatically.

## Layout

- Public pages: `Container` (max-w-7xl), generous vertical space (`py-28 sm:py-40`), full-bleed media inset by 8–12 px with 28 px corners.
- App pages: `mx-auto max-w-6xl px-5 sm:px-6`.
- Every page works at 390 px: stack columns, full-width buttons, no horizontal page scroll (only rails scroll).
- Exam and practice screens stay plain and focused while a candidate is answering. The proctored mock-exam room keeps its dark focus surface (`.focus-surface`).

## Motion and media

- Calm and intentional: cross-fades, slow zoom (`.cine-zoom`, Ken Burns in the hero), fade-and-rise on scroll (`FadeIn`), scroll-driven parallax where supported (`.parallax-y`), hover previews on clip panels. No bouncing, floating or neon glow.
- Everything respects `prefers-reduced-motion` (global rule) and the media hooks in `src/components/cine/media.ts`: with reduced motion or Save-Data, clips never load and the hero never rotates.
- `CineVideo`: poster first, clip only near the screen, playing only while visible; 640 px clips on phones. `CineHero`: first clip after page load, next clip preloaded half-way, slides hand over before the loop point (no frozen or black frames), Pause button, pauses off-screen and in background tabs. Clip details: `docs/MEDIA_SOURCES.md`.
- No invented testimonials, logos, user counts or success rates. Figures come from the live database; examples are labelled "Example".

## Candidate-safe content

Never render raw JSON, speaker labels (`S1:`), internal status fields, TTS notes or provider errors. Passages go through `src/lib/question-stimulus.ts` (see `docs/DO_NOT_BREAK.md`).
