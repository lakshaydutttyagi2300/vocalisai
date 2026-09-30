# UI design system

The rules behind the candidate-facing pages. Tokens and classes live in
`src/app/globals.css`; fonts in `src/app/layout.tsx`; icons via
`src/components/ui/Icon.tsx`. Use these before inventing new styles.

## Colour

| Token | Use |
| --- | --- |
| `brand-50 … brand-900` (navy) | Primary actions, links, focus rings, data bars |
| `ink-700 … ink-950` | Headings, dark panels (`panel-ink`), the landing hero |
| `amber-300 … amber-700` (gold) | One accent per view: eyebrows on dark, "needs work" bars, highlights. Never for body text on white |
| `slate-*` | Body text (600), secondary text (500), hairlines (100–200) |
| `red-*`, `green-*` | Only for right/wrong and scores under 60 — never decoration |

## Type

| Role | Class / font | Where |
| --- | --- | --- |
| Display | `.display` (Sora 700–800, tight tracking) | One per page: hero or next-step panel |
| Headline | `.headline` (Sora 600–700) | Page `h1`s, section titles |
| Eyebrow | `.eyebrow` / `.eyebrow-on-ink` (IBM Plex Mono, uppercase, 0.14em) | A short label above a heading |
| Lede | `.lede` | The one sentence under a hero heading |
| Body | Public Sans 400–600 | Everything else, 14–16 px |
| Numbers | `.num` (Plex Mono, tabular) | Scores, wpm, counts, timers |

## Surfaces

- **`.sheet`** — white, hairline border, 1.25 rem radius. The default container for a group of content. Prefer one sheet with internal dividers over many small cards.
- **`.panel-ink`** — the dark navy panel with a faint grid. At most one per page, for the thing that matters most (landing hero, dashboard next step).
- **`.card`** — the older card; still used inside practice and exam screens. Don't add new ones to marketing or dashboard pages.
- **`.rail`** — a horizontal scroll-snap row (sliders, exam library). Must stay keyboard-focusable with arrow-key support where it's a carousel (`LessonsSlider`).

## Buttons

`.btn-primary` (one per view), `.btn-secondary`, `.btn-dark` (on `panel-ink`), `.btn-ghost`, `.btn-danger`; sizes `.btn-sm`, `.btn-lg`. Links that navigate inside a section are plain text links (`text-brand-700 font-semibold`), not buttons.

## Layout

- Page container: `mx-auto max-w-6xl px-5 sm:px-6`.
- Order content by the question the user has: next action → status → what to improve → history (dashboard); headline → product → action → proof (landing).
- Every page is designed at 390 px as well as desktop: stack columns, full-width primary buttons, no horizontal page scroll (only rails scroll).
- Exam and practice screens stay plain and focused: no dark panels, animation or marketing elements while a candidate is answering.

## Motion and media

- Motion is short (≤ 400 ms), purposeful, and disabled under `prefers-reduced-motion` (global rule in `globals.css`).
- Videos never autoplay: a poster image with a play button loads the clip only on click, muted, with controls and a visible caption.
- No stock photos of people and no invented testimonials, logos, user counts or success rates. Examples of results are labelled "Example".

## Candidate-safe content

Never render raw JSON, speaker labels (`S1:`), internal status fields, TTS notes or provider errors. Passages go through `src/lib/question-stimulus.ts` (see `docs/DO_NOT_BREAK.md`).
