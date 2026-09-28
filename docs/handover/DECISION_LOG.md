# Decision log

Sources:
- `CHANGES.md` (the detailed history, phase by phase; read it for depth);
- code comments;
- the owner's instructions recorded in CLAUDE_CODE_SETUP.md.

"Still follow?" is the recommendation for future work.

| # | Decision | Reason | Alternatives considered | Current implementation | Still follow? |
|---|---|---|---|---|---|
| 1 | **Additive-only DB changes, through reversible Prisma migrations; show the plan first; never touch production without approval** | Owner requirement: don't break the existing exam system or user data. The 24-25 Sep outage came from code going live before the DB was migrated. | Drop and recreate columns; migrate automatically on deploy | 12 migrations, all additive (new nullable columns and tables). The Vercel build does **not** migrate. | **Yes** |
| 2 | **Deploy to production only when the owner says "ship to production"**; work on `feat/skills-platform`, commit per phase | Owner requirement; pushing `main` deploys live | Deploy from the branch; CI gates | `main` is fast-forwarded from the branch at release | **Yes** |
| 3 | **Test on a local staging copy, not Vercel previews** | Preview has no env vars, and the owner found copying about 12 secrets in the Vercel UI too hard | Configure Preview env vars | `scripts/dev-staging.mjs` and `.claude/launch.json` entry `staging-test`, against the Neon staging branch | **Yes** (until Preview vars are set up) |
| 4 | **Mandatory post-deploy checks:** `/api/health` and `vercel logs` | The 26 Sep outage (missing `DATABASE_URL`) went unnoticed by logged-out checks | Rely on the build succeeding | `src/app/api/health/route.ts` (`SELECT 1`, public) | **Yes** |
| 5 | **DB URL fallback:** use `DATABASE_URL_UNPOOLED`, rewritten to the Neon pooler host, when `DATABASE_URL` is missing | Hotfix for the outage; it keeps the site up | Fail hard | `resolveDatabaseUrl()` in `src/lib/db.ts` (tested in `db-url.test.ts`) | Yes, but **also re-add `DATABASE_URL` in Vercel** |
| 6 | **Zero-cost mode:** ElevenLabs built but off; best device voice instead | The owner won't pay now; the ElevenLabs free tier bans commercial use | Paid ElevenLabs ($6/month Starter), other paid TTS | `src/lib/tts/*`; a key turns it on with no code change | **Yes**, until the owner decides otherwise |
| 7 | **TTS guard rails** (for when ElevenLabs is on): server-side key only, sources allow-listed, daily per-plan limits, credit reserve, R2 cache by text hash, `NATURAL_VOICES` flag | Control cost and abuse; secrets never reach the browser | Direct browser calls | `api/tts`, `src/lib/tts/service.ts` | **Yes** |
| 8 | **One conversion point for candidate stimulus**; raw JSON and S1/S2 labels never reach the candidate | Raw audio specs and speaker IDs had leaked into the UI | Clean data in the DB only | `src/lib/question-stimulus.ts`; e2e raw-data guard | **Yes (critical)** |
| 9 | **Fresh-first question selection across every activity**, using attempt history (no new exposure table) | Owner asked that users not see the same questions repeatedly; history already existed | Fixed cooldown (`selectWithCooldown`, now unused), a per-user exposure table | `src/lib/question-freshness.ts` | **Yes** |
| 10 | **Large bank stored as code** (`prisma/skills-content/*.mjs`), generated items with computed answers, idempotent loader | Reviewable in git, reproducible, answers verified by tests; no AI cost | AI-generating questions at runtime | `npm run seed:skills-content` (`--production` for live) | **Yes** |
| 11 | **Skills taxonomy as the backbone** (12 categories; questions, drills, exams and goal tracks are all "recipes over skills"); only 8 categories visible in v1 | The owner's blueprint rev. 2 (26 Sep 2026) | Keep only the 17 flat practice categories | `src/lib/skills/taxonomy.ts`, `Skill` table, legacy mapping | **Yes** |
| 12 | **Mastery model:** 0-100, 14-day half-life, difficulty-weighted; "Weak" needs at least 5 answers; Mastered at 90 or more | Recent and harder answers matter more; avoids labelling someone weak after 1 answer | Plain average | `src/lib/skills/mastery.ts`; saved after the response with `after()` so answers stay fast | **Yes** |
| 13 | **One drill = one practice-session charge**, using a signed drill token (HMAC with `NEXTAUTH_SECRET`) | Stop a drill of 8 questions from using 8 credits | Charge per question | `src/lib/skills/drill-token.ts` | **Yes** |
| 14 | **Two exam runners**: keep v1; v2 only for templates linked to an exam format, behind `exam_runner_v2` | Don't break the existing exam; add IELTS-style timed papers safely | Replace v1 | `runnerForTemplate()` in `src/lib/exam-runner.ts` | **Yes** |
| 15 | **Feature flags fail open** (a missing row means ON), except `DEFAULT_OFF_FEATURES` | A fresh DB never looks broken | Fail closed | `src/lib/feature-flags.ts` | **Yes** |
| 16 | **Proctoring integrity never scores on its own** (Phase 5) | An exam with no answers showed "100 - interview ready" | Keep the old behaviour (a test even asserted it) | `computeScoreReport` in `src/lib/scoring-engine.ts` | **Yes** |
| 17 | **Scores recomputed on view** (`GET .../score` upserts) | Admin weight changes apply; wrong old scores fix themselves | Freeze at the end of the exam | score route | Yes |
| 18 | **Local disk fallback for storage** when R2 is not configured | Easy local development | Require R2 everywhere | `src/lib/storage.ts`. Production **must** have R2. | Yes |
| 19 | **E2E against a production build** (`E2E_SERVER=start`) | The dev server ran out of memory compiling every page on the 8 GB Windows PC | Always use the dev server | `playwright.config.ts` | Yes on low-memory PCs |
| 20 | **`npm run lint` left broken** | `typescript-eslint` doesn't support TypeScript 7 yet | Downgrade TypeScript | the gates are `tsc --noEmit` and `build` | Revisit when typescript-eslint supports TS 7 |
| 21 | **IELTS-style content is original and labelled "-style"** with a trademark disclaimer | Avoid trademark or copyright problems | Copy real exam papers | `prisma/exam-demo/`, `TrademarkDisclaimer.tsx` | **Yes** |
| 22 | **Coding and personality tests out of scope** | Blueprint rev. 2 | | taxonomy comment | Yes |
