# Technical debt and open issues

Last reviewed: 30 Sep 2026. This replaces the old `KNOWN_ISSUES.md` and the open items of `NEXT_STEPS.md`.

Every item below was found by reading the code, the live configuration or the test runs. There are no `TODO`/`FIXME` comments in the code, so this file is the list.

**Priority:** **P1** blocks revenue or is a real risk · **P2** worth doing soon · **P3** improve when convenient.

## Open

| # | Priority | Problem | Why it matters / risk | Current behaviour | Recommended fix |
|---|---|---|---|---|---|
| 1 | **P1** | **Paid checkout is not live** | Users hit their plan limits with no way to pay. This is the main blocker to revenue. | The billing page, Paddle webhook and plan limits exist, but Vercel Production lacks `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, the three `NEXT_PUBLIC_PADDLE_PRICE_*` IDs and `PADDLE_WEBHOOK_SECRET`. Admins set plans by hand. | The owner creates the products, prices and a webhook (`https://vocalisai.vercel.app/api/webhooks/paddle`) in Paddle; then add the 5 variables (sandbox first). See [SERVICES_AND_SECRETS.md](SERVICES_AND_SECRETS.md#8-paddle-billing-not-fully-set-up). |
| 2 | P3 | **18 lint warnings: state set synchronously inside effects** | React's newer guidance (`react-hooks/set-state-in-effect`): an effect that immediately sets state causes an extra render. A performance concern, not a correctness bug; the React Compiler isn't enabled here. | Kept as warnings in `eslint.config.mjs`, in 16 components (mostly effects that reset an error or load data on mount). | Convert each when that component next changes: derive the value during render, move the reset into the event that caused it, or key the component. Then turn the rule back to `error`. |
| 3 | P2 | **Request validation is inconsistent** | A route that trusts a type cast can crash (500) or store bad data on unexpected input. | Of 37 routes that read a JSON body, 3 use a zod schema; the rest check fields by hand. Most hand checks are adequate (`typeof`, allow-lists); the two real bugs found (profile, admin candidate update) are fixed. | Use a zod schema for every **new or changed** route that reads a body (see `src/app/api/profile/route.ts`). Don't mass-rewrite working routes. |
| 4 | P3 | **The locked plan-limit check costs about six database round trips** | Negligible in production (Vercel and Neon are both in the US east), but ~1.5 s per gated action from a developer PC in India, which makes local testing slow. | `checkAndRecordUsage` runs `BEGIN`, advisory lock, count, insert, `COMMIT` as an interactive transaction. | If it matters, fold the count and insert into one statement after the lock, and avoid calling `getEffectivePlan` twice per request (`practice/attempts` also calls it through `checkDifficultyAccess`). |
| 5 | P3 | **A newly promoted admin must sign in again** | Minor admin inconvenience. | `src/proxy.ts` reads the role from the database (so demotion is immediate), but each admin API's `requireAdmin()` reads it from the login token, which is written at sign-in. | Acceptable. If it matters, have `requireAdmin()` read the role from the database too (tests that fake sessions would need real users). |
| 6 | P3 | **Gemini API key is sent in the URL** (`?key=`) | Keys in URLs can end up in proxy or error logs. Server-side only, so not exposed to users. | All six `src/lib/providers/gemini-*.ts` files. | Send it as the `x-goog-api-key` header instead. |
| 7 | P3 | **Gemini HTTP code is repeated in six providers** | Six copies of the same fetch / status check / text extraction to keep in step. | Each `gemini-*-provider.ts` has its own `callGemini`. JSON validation is already shared (`gemini-json.ts`). | Extract one small `generateContent(apiKey, model, parts, jsonMode)` helper. |
| 8 | P3 | **Conversation analyses don't retry on the fallback model when the reply has the wrong shape** | One bad AI reply ends that conversation's analysis with an error. | `gemini-conversation-provider.ts` validates after `callWithFallback`, so only HTTP failures fall back. The other providers validate inside the per-model call. | Pass the schema into the fallback helper. |
| 9 | P3 | **Proctoring is enforced on the candidate's device** | A modified browser could suppress camera or tab-switch events. | Detection (MediaPipe, on-device) and event reporting run client-side; the server records and scores what it receives. | Inherent to on-device detection (chosen for privacy and zero cost). Server-side video analysis would be a paid, privacy-heavy feature. |
| 10 | P3 | **No continuous integration** | Every check (type check, unit tests, build, browser tests) is run by hand before a release. | No `.github/workflows`. | A GitHub Action running `npx tsc --noEmit` and `npm test` on each push (needs a test-database connection string as a repository secret). |
| 11 | P3 | **Browser tests share one database and port** | Two runs at once corrupt each other (it happened on 28 Sep). | `tests/e2e` use the Neon **test** branch and port 3000. | Run one at a time (see [DEVELOPER_HANDOVER.md](DEVELOPER_HANDOVER.md#common-problems)). For CI, give each run its own Neon branch. |
| 12 | P3 | **Large page components** | Harder to change safely. | `src/app/admin/questions/page.tsx` (912 lines), `src/app/page.tsx` (466, mostly landing-page copy), `src/components/practice/VoicePracticeSession.tsx` (498). | Split the admin Question Bank page into filters / table / editor components when it next changes. Don't split just for size. |
| 13 | P3 | **10 `react-hooks/exhaustive-deps` suppressions** | Each hides a possible stale-value bug. | `// eslint-disable-next-line react-hooks/exhaustive-deps` in the practice, mock-test and exam-runner components (lint confirms each still suppresses a real report). | Review each one; most are "run once on mount" effects that could be restructured. |
| 14 | P3 | **Frontend API calls are hand-written in each page** | Loading and error handling vary slightly page to page. | About 80 `fetch()` calls in 33 files; no shared client or data library. | Keep the pattern (it is simple and consistent enough). If pages multiply, add one small typed `apiFetch` helper rather than a data-fetching library. |
| 15 | P3 | **Text columns used as enums** | The database doesn't reject an invalid category, role or plan; the code does. | Fields such as `role`, `plan`, `category`, `difficulty` are `String` (the project started on SQLite, which has no enums). | Keep validating in code (`src/lib/plans-and-roles.ts`, `practice-taxonomy.ts`). Converting to Prisma enums needs migrations on live data. |
| 16 | P3 | **Two exam engines** | More code to maintain. | v1 (section-by-section) and v2 (timed papers, `exam_runner_v2`) both run, chosen per template. | Intentional (see [DECISION_LOG.md](DECISION_LOG.md) #14). Unify only with a full test plan. |
| 17 | P3 | **Content gaps** | Fewer fresh questions in some areas. | Hidden skill categories COG, DIN, BIZ, DGT have no content; pronunciation (Advanced 38, Expert 33) and reading comprehension (Intermediate to Expert, 37-38) are just under 40 per level. | Add items in `prisma/skills-content/` or through the admin import; then consider turning on `skills_all_categories`. |
| 18 | P3 | **Development database is behind production** | Local testing sees fewer questions than live. | The Neon `development` branch was copied from production on 15 Sep and lacks later content (e.g. the 28 Sep +395 questions). | Re-run the content seeds against development, or reset the branch from production (Neon "reset from parent") after exporting anything needed. |
| 19 | P3 | **`xlsx` comes from the SheetJS CDN, not npm** | `npm install` needs cdn.sheetjs.com; `npm audit` can't see it. | `package.json`: `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` (SheetJS stopped publishing current versions to npm). Used by the admin question import/export. | Acceptable. Check for a newer tarball occasionally. |
| 20 | P3 | **Runtime CDN dependencies** | If blocked, the feature degrades. | MediaPipe (exam camera check) loads from cdn.jsdelivr.net and storage.googleapis.com; the exam still runs without it. | Acceptable; documented in [SERVICES_AND_SECRETS.md](SERVICES_AND_SECRETS.md). |
| 21 | P3 | **ElevenLabs natural voices are off** | Listening uses the device's voices. | Built, but no `ELEVENLABS_API_KEY` (owner's zero-cost decision). | Business decision. Adding the key turns it on; no code change. |

### From the independent QA pass (29 Sep 2026)

Reproductions for 22-26 are in `tests/unit/qa-open-findings.test.ts` (skipped blocks; remove `.skip` to run).

| # | Priority | Problem | Recommended fix |
|---|---|---|---|
| 22 | P2 | **Parallel conversation turns pass the turn limit** (a FREE user got 8 turns against a limit of 3 by sending them at once). `conversations/[id]/turns/route.ts` checks the count, then creates the turn much later. | Reserve the candidate turn inside a per-conversation lock before transcribing (a placeholder turn, filled in afterwards, deleted on failure). |
| 23 | P2 | **Parallel requests pay for the same AI result more than once** (5 parallel "end conversation" calls made 5 Gemini calls). Affects `conversations/[id]/complete`, `mock-tests/sessions/[id]/report` and `.../score`. | Claim the work atomically before calling the AI (e.g. `updateMany` with a "not yet processing" condition); only the winner calls the AI. |
| 24 | P2 (before billing goes live) | **Paddle webhook ordering**: a late `subscription.updated` can re-grant a cancelled plan, and any mid-period update resets that month's usage (`setPlan` sets `currentPeriodStart: now`). | Store the last applied event's `occurred_at` and ignore older events; take the period start from Paddle's `current_billing_period.starts_at`. |
| 25 | P3 | Parallel sign-up code guesses can test more than 5 codes per emailed code. | Take the attempt atomically (`updateMany ... attempts: { lt: MAX }`, increment) before comparing. |
| 26 | P3 | Admin candidate search treats `%` and `_` as wildcards. | Escape them in `getAdminUsers()`. |
| 27 | P3 (voices are off) | The daily voice limit has the same count-then-generate race as plan limits had. | Same advisory-lock pattern as `checkAndRecordUsage()` in `src/lib/tts/service.ts`. |

### From the UI redesign (30 Sep 2026)

| # | Priority | Problem | Recommended fix |
|---|---|---|---|
| 28 | P3 | **Older page style on secondary pages**: progress, speech analysis, coach, profile, results, auth and admin pages still use the pre-redesign header and equal-weight cards. | Apply `docs/UI_DESIGN_SYSTEM.md` (eyebrow + headline header, `sheet` groups instead of many cards) when each page next changes. |
| 29 | P3 | **Two landing-page lessons have no clip** (listening and timed-paper strategy). A timed-exam clip needs a camera feed that isn't a test pattern. | Record them with a real volunteer's consent, or leave them as text. See `docs/MEDIA_SOURCES.md`. |

## Resolved on 29-30 Sep 2026

- **Lint runs again** (`npm run lint`: 0 errors). `typescript` now points at the TypeScript 6 API (`@typescript/typescript6`) for tools like typescript-eslint, while `tsc` stays TypeScript 7 (`@typescript/native`), as Microsoft documents; `eslint.config.mjs` uses the Next.js 16 flat config including the TypeScript rules. The 57 errors it found were fixed: unescaped text characters, dead variables, a refs-during-render pattern in the proctoring hook, and justified suppressions for three false positives (event-handler code, file-download links).
- **Plan limits could be exceeded by parallel requests** (8 parallel FREE speech analyses got 6 through a limit of 2); count and record now run under a per-user+feature database lock. Interview Simulations on paid plans now stop at their 4-turn length.
- **A mock assessment accepted unlimited answers**, each analysed for free on the score page. Answers are now capped at the template's question count and refused 10 minutes after the assessment ends (`tests/unit/mock-attempt-limit.test.ts`).

- **Admin APIs relied on a single layer of role checking, and demotion didn't take effect.** `src/proxy.ts` only role-checked paths starting `/admin` (never `/api/admin`) and trusted the role in the login token. It now reads the role from the database and covers `/api/admin` (`tests/unit/proxy.test.ts`).
- **Raw AI/provider error text reached candidates** from nine AI failure paths. They now log the detail and show a plain message (`tests/unit/ai-error-messages.test.ts`).
- **AI replies were used without checking their shape.** Every structured Gemini reply is now validated with zod before it's stored or shown (`src/lib/providers/gemini-json.ts`, `tests/unit/ai-output-validation.test.ts`).
- **A failed AI feature still used up a plan allowance.** Server-side failures now give the use back (`refundUsage`, `tests/unit/ai-usage-refund.test.ts`).
- **Profile update** crashed on bad input, had no length limits, and wiped fields that weren't sent.
- **Admin candidate update** applied a plan change before validating the rest of the request.
- The admin check was copied into 19 route files (now all use `requireAdmin()`); the plan and role lists were defined in four places (now `src/lib/plans-and-roles.ts`).
- Removed `benchmark/` (old scripts, including one that would delete every user but two) and the unused `@neon/env` dependency.
- Earlier the same day: Admin Candidates paging, Campus / Study Abroad goal tracks, SELT / PTE / Cambridge / Employment exam content, the Vercel Preview environment, and the check for old wrong "100" readiness scores (none found).
