# Known bugs, gaps and technical debt (28 Sep 2026)

Found by inspecting the code, the live configuration (`vercel env ls`), the Phase 5 page walk-through and the test runs. The code has **no TODO/FIXME comments**, so this list comes from inspection, not comments.

Priority: **P1** fix soon · **P2** important · **P3** nice to fix.

| Priority | Issue | Location | Current behaviour | Expected behaviour | Suggested fix |
|---|---|---|---|---|---|
| **P1** | `DATABASE_URL` missing in Vercel **Production** | Vercel dashboard, vocalisai, Settings, Environment Variables | The site works only through the hotfix fallback (`DATABASE_URL_UNPOOLED` rewritten to the pooler host). | Both variables set. | Add `DATABASE_URL` = the production **pooled** connection string, Production scope, then redeploy. Keep the fallback. |
| **P1** | Phase 5 fixes not live | branch `feat/skills-platform` | Live site: an exam with no answers shows "100 - interview ready"; the other phone-layout issues remain. | Fixed. | After the owner says "ship to production", follow the runbook (GIT_AND_DEPLOYMENT.md). No migration needed. |
| P2 | E2E runs can corrupt each other | `tests/e2e/*` (shared Neon test branch and port 3000) | 28 Sep: a leftover runner from an interrupted session ran at the same time and caused 5 failures. Run alone, those specs pass (CURRENT_STATE.md). | One run at a time. | Before any e2e run, check that no `node` process is running and port 3000 is free. The v2 UI spec also got a camera retry. |
| P2 | Paid checkout not configured | Vercel env (`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_*`, `PADDLE_WEBHOOK_SECRET` missing); `src/app/billing/page.tsx`, `api/webhooks/paddle` | The billing page's upgrade buttons are inactive; plans are set by admins. | Candidates can buy plans. | The owner creates the Paddle products and prices and a webhook to `/api/webhooks/paddle`; then add the variables. It's a business decision, since money is involved. |
| P2 | Unplayable listening questions can be imported | `src/lib/question-validation.ts` | A listening question whose JSON `passage` isn't a recognised audio spec is accepted. Candidates see no audio (safe, no raw JSON, but unanswerable). | Rejected at import/edit with a clear message. | For LISTENING / LISTENING_COMPREHENSION with a JSON passage, require `parseStimulusSpec()` to return `kind: "audio"` with at least 1 turn. Add a unit test. |
| P2 | Small question pools in some areas | content, `prisma/skills-content/` | Fresh-first can't avoid repeats once a small pool is used up (listening, writing, fluency, interview, conversation roles). | Enough items that regular users rarely repeat. | Add content (authored files, or admin import). Check the live coverage grid first (Admin, Question Bank). |
| P2 | Not all listening questions have pre-generated audio | `prisma/generate-question-audio.mjs` | Those use browser voices (quality depends on the device). | Generated two-voice audio for all. | On a Windows PC run `npm run generate:question-audio -- --dry-run`, then with `--production` (free). |
| P2 | Vercel Preview deployments don't work | Vercel env (Preview has no variables) | Preview builds can't reach a DB or log in. | Either working previews or none. | Keep using the local staging copy, or copy the variables to Preview pointing at the **staging** branch. The owner found this hard; do it with the Vercel CLI (`vercel env add <NAME> preview`). |
| P3 | `npm run lint` fails | `eslint.config.mjs` | `typescript-eslint` refuses TypeScript 7. | Lint runs. | Wait for typescript-eslint TS 7 support. Until then use `npx tsc --noEmit` and `npm run build`. |
| P3 | Admin Candidates list has no paging | `src/app/api/admin/candidates/route.ts`, `src/lib/admin-stats.ts` | Loads every user with stats (fine for the current 2 live users; the page is very long in the test database, which has hundreds). | Paged or searchable server-side. | Add `take`/`skip` and a page control. |
| P3 | Old wrong "100" readiness scores may still be stored | `ScoreReport` rows of exams ended with no answers | The dashboard, Progress and Coach show the stored value until that exam's results page is opened again (it recalculates). | Correct everywhere. | Optional one-off: recompute the score reports that have no scored answers, **with approval and a backup**. Couldn't be counted on 28 Sep (read-only production queries were blocked). |
| P3 | Unused selection helper | `src/lib/question-selection.ts` (`selectWithCooldown`) | Dead code; replaced by `question-freshness.ts`. | n/a | Delete in a clean-up (check tests first). |
| P3 | Empty-exam results message | `src/app/mock-tests/results/[sessionId]/page.tsx` (`readinessLine`) | With nothing answered it says "Analyze more responses to see your readiness." | Something like "No answers were scored in this exam." | Pass the answered count and word it accordingly. Cosmetic. |
| P3 | Dev server runs out of memory on this 8 GB PC during full e2e runs | `playwright.config.ts` | `next dev` compiling about 45 pages crashed (Windows "Zone Allocation failed"). | n/a | Use `npm run build`, then `E2E_SERVER=start npx playwright test`. Clear `.next/dev/cache` if Turbopack reports "Insufficient system resources". |
| P3 | `.env.test.example` is not in git | `.gitignore` (`.env*`) | The template for the test env isn't committed. | Committed (placeholders only). | `git add -f .env.test.example` |
| P3 | Package name and description still say "ProActing" | `package.json` | Old product name. | "vocalisai" | Cosmetic. Don't rename the folder or scripts without reason. |
| P3 | Hidden skill categories and other exam families have no content | taxonomy (COG, DIN, BIZ, DGT); exam families SELT, PTE, Cambridge, Aptitude, Employment | Hidden or unused. | Content when the owner wants those areas. | Content work; enable with `skills_all_categories` once there are enough items. |

Fixed during Phase 5 (on the branch, not yet live):
- empty exam scored 100;
- Templates buttons overflowing on phones;
- Coach page scroll jump;
- cramped conversation difficulty buttons;
- speech-analysis page offering to analyse typed answers;
- new questions not skill-tagged.
