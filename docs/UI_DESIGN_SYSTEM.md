# UI design system

The rules behind every page. October 2026 direction (owner's brief): **one warm,
light design system** for the whole app and site. Cream background, white
cards, near-black text, **one accent (warm gold) used sparingly**, soft layered
shadows, real photos and short clips in page heroes. No black blocks larger
than a button, no red except for errors, no neon or rainbow gradients.

Everything lives in `src/app/globals.css` (tokens and component classes),
`src/app/layout.tsx` (fonts, theme script), `src/components/ui/` (Icon,
MediaHero, PageContainer, ScoreRing, ThemeToggle) and `src/config/heroMedia.ts`
(every page hero's words and media). Use these before inventing new styles.

## Colour tokens

Raw values are CSS variables on `:root` (light) and `html[data-theme="dark"]`
(dark). Tailwind utilities are mapped to them in `@theme inline`, so
`bg-surface`, `text-fg-muted`, `border-line`, `bg-accent-soft` and so on follow
the theme automatically.

| Token (CSS var) | Tailwind | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--bg` | `bg-bg` | #F7F5F1 | #1A1917 | Page background |
| `--surface` | `bg-surface` | #FFFFFF | #232120 | Cards, inputs, menus |
| `--surface-muted` | `bg-surface-muted` | #F1EEE8 | | Quiet panels, tracks of bars |
| `--border` | `border-line` | #E7E2DA | | Hairlines and card borders |
| `--text` | `text-fg` | #1C1B19 | | Headings and body |
| `--text-muted` | `text-fg-muted` | #6B6760 | | Secondary text |
| `--text-subtle` | `text-fg-subtle` | #736D64 | | Hints, captions (brief: #9A958D, darkened to pass WCAG AA) |
| `--accent` | `bg-accent`, `stroke-accent` | #B8862F | #D4A24C | Progress bars, the active nav line, focus rings, one highlight per view |
| `--accent-strong` | `text-accent-strong` | #7D5819 | | Accent-coloured **text** (AA on light backgrounds) |
| `--accent-soft` / `--accent-softer` | `bg-accent-soft` | #F5EBD7 / #FBF6EC | | Selected states, icon tiles, badges |
| `--accent-line` | `border-accent-line` | #E5CD9C | | Borders of highlighted panels |
| `--ink` | `bg-ink` | #24221F | | **Primary buttons only** |
| `--success`, `--warning`, `--danger`, `--info` (+ `-strong`, `-soft`) | `bg-success` … | #2F7D5B, #B7791F, #B54A3A | | Right/wrong, "needs work", **errors only** for danger |
| `--chart-1 … --chart-6` | `fill-chart-1` … | gold, sage, terracotta, slate blue, sand, charcoal | | Chart series |

The older scales (`white`, `slate`, `ink`, `brand`, `champagne`, `night`,
`mist`, `red`, `green`, `amber`) are mapped onto the same variables, so older
markup re-skins and inverts in dark mode. New code should use the semantic
names above.

**Dark mode** is optional, chosen per browser in **Account → Appearance**
(`ThemeToggle`, saved as `localStorage["vx-theme"]`). Light is the default. A
tiny script in `layout.tsx` applies the choice before the first paint, so there
is no flash.

## Type, spacing, shape

| Scale | Values |
| --- | --- |
| Type | 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px (`text-xs` … `text-4xl`); `.display` for hero titles, `.headline` for page and section titles, `.eyebrow` for short labels, `.num` (Plex Mono, tabular) for numbers |
| Fonts | Inter Tight (display), Inter (body), Instrument Serif italic (`.serif-accent`, one word at most), IBM Plex Mono (numbers) |
| Spacing | 4 px steps (Tailwind's default scale) |
| Radius | 12 px cards (`.card`, `.sheet`), 10 px inputs (`.input-field`), 20 px hero frames, full pills for chips |
| Shadow | `--shadow-sm` / `--shadow-md` / `--shadow-lg`: soft, warm and layered. `.lift` raises a card on hover |

## Layout

- `PageContainer` / `.page-container`: max 1280 px, side padding 16 / 32 / 48 px (phone / tablet / desktop). Use a 12-column grid (`lg:grid-cols-12`) for dashboards.
- Every page starts with a `MediaHero` (below) and ends with real content, never an abrupt empty end.
- Every page works at 375-390 px: columns stack, nothing scrolls sideways (only rails), buttons fill the width where it helps. Grids that hold truncated text need `grid-cols-1` (or `min-w-0` on the item) so they can shrink.
- Exam and practice screens stay plain while a candidate is answering.

## Components (classes in `globals.css`)

| Component | Use |
| --- | --- |
| Buttons | `.btn-primary` (ink, one per view), `.btn-secondary` (white, outlined), `.btn-accent` (gold), `.btn-ghost`, `.btn-danger` (destructive only); sizes `.btn-sm`, `.btn-lg`; `data-loading` shows a spinner |
| Cards | `.card` / `.sheet` (white, border, shadow); `.panel-ink` for the one highlighted panel on a page (soft gold gradient, dark text) |
| Selected state | `.choice` + `data-selected` / `aria-pressed` / `aria-checked` / `aria-selected`: gold border, soft gold fill and a check in the corner. Never black |
| Inputs | `.input-field` |
| Badges | `.badge` + `badge-skill`, `badge-ai`, `badge-neutral`, `badge-success`, `badge-danger` |
| Nav | White, translucent header with blur; gold underline under the current page; white dropdown cards; admin pill in soft gold; Log out as a secondary button |
| Charts | Plain SVG, coloured with `fill-*` / `stroke-*` token utilities (`src/components/dashboard/WeeklyChart.tsx`, `ScoreRing`) |
| Empty states | An icon in a soft gold circle, one sentence, one button |
| Modals | Native `<dialog>` with `showModal()` (see `LearningResources.tsx`) |
| Skeletons | `animate-pulse` blocks in `bg-surface-muted`, shaped like the page (`src/app/loading.tsx`) |

## Page heroes: `<MediaHero>`

`src/components/ui/MediaHero.tsx`, configured in `src/config/heroMedia.ts`.

- Props: `eyebrow`, `title`, `subtitle`, `cta`, `secondary`, `children` (e.g. a search box), `stats` (chips), `side` (a widget), `back`, `media` (`{ type, src, alt }[]`), `variant` (`full-bleed` or `split`), `size` (`lg` 70vh / `md` / `sm`).
- Rotation: 800 ms cross-fade; a clip shows for one loop (~6 s), a still for 7 s. Progress bars to see and pick slides; pauses on hover, in a background tab, off-screen, and with the Pause button.
- Loading: the first poster is fetched eagerly with high priority; only the current and next clip ever load. WebM first, MP4 fallback.
- Reduced motion: the first picture only, no rotation, previous/next arrows. Phones, Save-Data and 2G/3G: stills only, never video.
- Light treatment: a cream gradient (`.scrim-left`, `.scrim-bottom`) behind dark text, never a black overlay.
- Admin pages use no media: `src/app/admin/layout.tsx` puts them on a soft gradient band (`.admin-band`).

## Media rules

- **One place per picture.** Every photo and clip is registered once in `src/config/mediaLibrary.ts` and has exactly one placement on the whole site; a clip and its still count as one. Pages ask the library for their scene (`scene("home.voice")`, `placed("app.dashboard")`) and never name a file themselves. The full list is [MEDIA_INVENTORY.md](MEDIA_INVENTORY.md); tests fail on any repeat.
- Pages built from a template (each company test, skill area, practice mode) show a preview of their own content (`ContentPreview.tsx`) instead of a photo; product demos repeated across pages use a different example each time.
- Local files only (no hotlinking): clips in `public/media/cine/`, stills in `public/media/stills/`; sources and licences in `docs/MEDIA_SOURCES.md`. Wanted shots are listed in `MEDIA_TODO.md`.
- Bright, warm, real situations (speaking, interviews, calls, studying). No company logos, robots or "AI brain" art.
- No invented testimonials, logos, user counts or scores. Every number on a page comes from the database; examples are labelled "Example".

## Candidate-safe content

Never render raw JSON, speaker labels (`S1:`), internal status fields, TTS notes or provider errors. Passages go through `src/lib/question-stimulus.ts` (see `docs/DO_NOT_BREAK.md`).
