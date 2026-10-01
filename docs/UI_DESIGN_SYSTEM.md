# UI design system

The rules behind the candidate-facing pages. Since the October 2026 redesign the
theme is light: white and soft grey surfaces, a bright professional blue leaning
indigo, rounded cards with soft shadows (the owner asked to move away from the
dark look). Tokens and classes live in
`src/app/globals.css`; fonts in `src/app/layout.tsx`; icons via
`src/components/ui/Icon.tsx`. Use these before inventing new styles.

## Colour

| Token | Use |
| --- | --- |
| `brand-50 … brand-900` (bright blue) | Primary actions, links, focus rings, selected states, data bars |
| `ink-700 … ink-950` | Headings and body text — not backgrounds on candidate pages |
| `indigo-*` (Tailwind) | Only as the far end of the brand gradient (`panel-ink`, the hero headline) |
| `amber-300 … amber-700` (gold) | "Needs work" bars and small highlights. Never for body text on white |
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

- **`.sheet`** — white, hairline border, 1.25 rem radius, soft shadow. The default container for a group of content. Prefer one sheet with internal dividers over many small cards. Add `.lift` to a sheet that is a link (rises slightly on hover).
- **`.panel-ink`** — the blue-to-indigo accent panel (name kept from its old dark version). At most one per page, for the thing that matters most (dashboard next step, current plan, closing call to action). Inside it `.btn-primary` turns white and `text-slate-*` turns soft white automatically.
- **`.hero-light`** — the landing hero backdrop: white into pale blue with two soft colour glows.
- **`.card`** — the older card; still used inside practice and exam screens. Don't add new ones to marketing or dashboard pages.
- **`.rail`** — a horizontal scroll-snap row (sliders, exam library). Must stay keyboard-focusable with arrow-key support where it's a carousel (`LessonsSlider`).

## Buttons

`.btn-primary` (one per view), `.btn-secondary`, `.btn-dark` (on `panel-ink`), `.btn-ghost`, `.btn-danger`; sizes `.btn-sm`, `.btn-lg`. Links that navigate inside a section are plain text links (`text-brand-700 font-semibold`), not buttons.

## Layout

- Page container: `mx-auto max-w-6xl px-5 sm:px-6`.
- Order content by the question the user has: next action → status → what to improve → history (dashboard); headline → product → action → proof (landing).
- Every page is designed at 390 px as well as desktop: stack columns, full-width primary buttons, no horizontal page scroll (only rails scroll).
- Exam and practice screens stay plain and focused: no accent panels, animation or marketing elements while a candidate is answering. The proctored mock-exam room keeps its dark focus surface (`.focus-surface`).

## Motion and media

- Motion is short (≤ 400 ms), purposeful, and disabled under `prefers-reduced-motion` (global rule in `globals.css`).
- The landing hero (`HeroSlider`) is the one place clips play by themselves: silent 5-second loops (~250 KB), loaded only after the page has loaded and only for the slide on screen, never with reduced motion or Save-Data, paused off-screen, in background tabs and by its Pause button. Everywhere else videos play only on click (poster + play button).
- Stock footage of people is allowed only in the hero slider and the sign-in panel, from Pexels (docs/MEDIA_SOURCES.md), captioned with what VocalisAi does, never as users, testimonials or results. No invented testimonials, logos, user counts or success rates. Examples of results are labelled "Example".

## Candidate-safe content

Never render raw JSON, speaker labels (`S1:`), internal status fields, TTS notes or provider errors. Passages go through `src/lib/question-stimulus.ts` (see `docs/DO_NOT_BREAK.md`).
