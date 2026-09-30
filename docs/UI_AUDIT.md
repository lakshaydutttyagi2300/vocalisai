# UI audit

30 Sep 2026, from screenshots of every page at 1280 px and 390 px (`tests/e2e/walkthrough.spec.ts`) and the page code.

## Summary

The foundations are sound: one colour scale (navy brand, gold accent, cool greys), self-hosted fonts (Sora, Public Sans, IBM Plex Mono), one documented button system, one input style, no sideways scrolling on phones. The problem is composition. Almost every page is a stack of white, equally weighted, bordered boxes with a heading and a paragraph, so nothing leads the eye and the product looks like a template.

## Biggest problems

| Area | Problem | Why it matters |
|---|---|---|
| Landing page | Eleven sections, most of them "centred heading + paragraph + grid of cards". The hero is mostly text (an 85-word paragraph) beside a small mock card; stock photos and blurred colour blobs do the visual work. "Exam, assessment or interview" is repeated in almost every section. | A visitor can't tell in a few seconds what the product does or what it looks like to use. |
| Landing page | "Take a Free Mock Test" leads new users to a plan that includes **0** mock assessments. Both hero buttons go to sign-up. | A broken promise at the first click. |
| Landing page | Pricing, features and "problems we solve" restate each other; the "Key features" grid has nine cards of equal weight. | Length without new information. |
| Navigation | Seven top-level items plus Log out, all the same weight; no clear primary action once signed in. | Everything competes. |
| Candidate dashboard | Two competing banners ("Choose my goal", "Start Assessment"), then four cards that repeat the navigation, then thin lists. No answer to "what should I do next?" or "how am I doing?". | The page people see most tells them the least. |
| Mock exams | 37 near-identical cards in two columns under 25 filter chips; nothing points to the exams for the candidate's goal. | Choosing a test is hard work. |
| Practice, skills, results | Consistent but flat: bordered white cards everywhere, weak type scale, lots of small grey text. | Readable, but not premium. |
| Exam screens | Clear and focused (good). Keep them that way; only polish typography and spacing. | Clarity beats decoration during a test. |
| Mobile | Layouts shrink rather than recompose: long single-column stacks of the same cards; the landing hero text is very long on a phone. | Mobile needs its own composition. |
| Media | No educational content or product demonstrations; four Unsplash photos only. | Nothing shows the product working. |

## What not to change

Behaviour, routes, API calls, exam logic, proctoring, and the accessible names the browser tests rely on (e.g. "What are you preparing for?", "Choose my goal", "Open my plan", the "Speech analyses" and "Mock exam results" lists, "Toggle menu", the "Main" navigation, "Choose a mock test").

## Status (30 Sep 2026)

| Area | Done |
|---|---|
| Landing page | Rebuilt: dark product-led hero with a live example analysis, a bento of real features, exam-library rail, micro-lesson slider with two of our own product clips, goal explorer, one pricing grid. Stock photos removed; "Start free" replaces the broken free-mock promise. |
| Navigation | Dark over the landing hero; unchanged elsewhere. |
| Candidate dashboard | Reordered around next step → performance → what to improve → recent activity. |
| Mock exams | Goal-linked tests first, grouped compact rows, a sticky panel for the chosen test; phones keep a fixed start bar. |
| Practice library | Featured AI conversation and quick drill, jump links, one indexed list per skill group. |
| Billing | Current plan with usage meters; a plan comparison that shows what each plan includes. |
| Still to do | Progress, speech analysis, coach, profile, results, auth and admin pages keep the older page header and card style (see `TECHNICAL_DEBT.md` #28). Exam screens are intentionally unchanged. |
