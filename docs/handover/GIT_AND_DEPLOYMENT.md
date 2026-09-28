# Git, GitHub and deployment

## Repository
- **URL:** https://github.com/lakshaydutttyagi2300/vocalisai. **PUBLIC**, so never commit secrets.
- **Default branch:** `main`. Every push to `main` **deploys to production** (Vercel, https://vocalisai.vercel.app).
- **GitHub Actions / workflows:** none (there is no `.github` folder).
- **Repository secrets and variables:** none used. Secrets live in Vercel and in local `.env*` files.
- **Pull requests / issues:** none open or closed (checked with `gh pr list` and `gh issue list` on 28 Sep 2026).

## Branches (28 Sep 2026)

| Branch | Commit | State |
|---|---|---|
| `main` | `e477b8c` Phase 4: Goal Tracks and onboarding | = origin/main = **live site** |
| `feat/skills-platform` | `e477b8c` (the same commit) plus **uncommitted Phase 5 work** | current working branch; tracks origin |
| `design/premium-dashboard-concept` | local `cfe9fe0`, origin `6fed26b` | an old dashboard *visual concept* that was never merged into `main`. The local branch is **1 commit ahead** of GitHub (`cfe9fe0`): the "Listening Comprehension had no audio" fix. That fix is **already in `main`** as `d5cbfd1`. Optional: `git push origin design/premium-dashboard-concept` to keep the concept on GitHub. Nothing else depends on it. |

No stashes.

## Recent history (newest first)
```
e477b8c Phase 4: Goal Tracks and onboarding (goal choice, My goal plan, track exams)
b50c814 Add /api/health: public database-reachability check for release smoke tests
d59abcb Hotfix: fall back to Neon's direct address when DATABASE_URL is missing
0e1416c Phase 3 free mode: best on-device voice per accent, no notes while ElevenLabs is off
60d53a8 Phase 3: natural voices (ElevenLabs) with caching, daily limits and fallback
8494171 Large question bank (2,318) + fresh-first selection in every activity
bd06509 Phase 2: skill mastery, Quick Drills, "I'm weak in" diagnostics, My Skills dashboard
39ee244 Phase 1: skills taxonomy seeded, questions mapped to skills, goal tracks and blueprints
bf81f76 Fix S1/S2 speaker labels reaching candidates
7fa345b Raw-data guard: v2 exam renders question-level audio/picture specs; verification tests
c4451a3 Mock test: never show raw question data; real two-voice listening audio pipeline
... (P1-A to P1-H: exam catalogue, item groups, question types, v2 runner, admin screens)
```

## Uncommitted work at handover (Phase 5 QA)

### 1. Complete; should be committed
| File | Change |
|---|---|
| `src/lib/skills/question-tags.ts` (new) | automatic skill and level tags for new or edited questions |
| `src/lib/question-import.ts` | bulk import adds skill tags |
| `src/app/api/admin/questions/[id]/route.ts` | admin edit keeps tags in step |
| `src/app/api/admin/questions/[id]/duplicate/route.ts` | duplicate copies tags |
| `src/app/api/practice/questions/generate/route.ts` | AI scenarios get tags |
| `src/lib/scoring-engine.ts` + `tests/unit/scoring-engine.test.ts` | an exam with no answers is unscored (no fake "100") |
| `src/app/admin/templates/page.tsx` | buttons wrap on phones |
| `src/app/coach/page.tsx` | page no longer jumps down on phones |
| `src/app/practice/conversation/page.tsx` | difficulty buttons 2x2 on phones |
| `src/app/practice/results/[attemptId]/page.tsx`, `src/app/api/practice/attempts/[id]/analyze/route.ts` | clear message for typed answers or unknown links |
| `tests/unit/question-tags.test.ts` (new), `tests/e2e/walkthrough.spec.ts` (new) | tests |
| `playwright.config.ts` | `E2E_SERVER=start` option |
| `CHANGES.md` | Phase 5 section |
| **Handover docs**: `CLAUDE_NEW_ACCOUNT_START.md`, `CURRENT_STATE.md`, `MIGRATION_CHECKLIST.md`, `NEXT_STEPS.md`, `docs/handover/*` | this package |
| `.env.test.example` | **currently untracked** because `.gitignore` has `.env*`. It is placeholders only and should be committed: `git add -f .env.test.example` |

### 2. Unfinished
- None in code. See CURRENT_STATE.md for the browser-test results of this work.

### 3. Must NOT be committed (already ignored)
- `.env`, `.env.local`, `.env.staging`, `.env.test`: **real secrets**.
- `.vercel/`, `.neon`, `.wrangler/`: CLI state.
- `uploads/`: local recordings, private user data.
- `test-results/`, `playwright-report/`: test output, including screenshots of test accounts.
- `node_modules/`, `.next/`, `tsconfig.tsbuildinfo`, `prisma/dev.db`: build and local files.
- `benchmark/audio/*.wav`, `benchmark/results/`.

### 4. Files that contain secrets
`.env`, `.env.local` (Vercel token), `.env.staging`, `.env.test`. All are ignored by `.env*` in `.gitignore`. **Check before every commit:** `git status` must never list them.

`next-env.d.ts` is sometimes rewritten by `next dev`/`next build`. If it shows as modified, it's harmless; commit it or `git checkout next-env.d.ts`.

## Commands to commit and push before leaving

Pushing the **branch** does not deploy. Only `main` deploys.

```bash
git status                       # check no .env* files are listed
git add -A
git add -f .env.test.example     # placeholders only
git status                       # final check
git commit -m "Phase 5: QA fixes, walk-through test, and handover package"
git push origin feat/skills-platform
```

Optional:

```bash
git push origin design/premium-dashboard-concept
```

## Release runbook (only after the owner says "ship to production")

1. **Backup:** Neon, create a branch from `production` named `backup-production-before-<what>`. The free plan allows 10 branches (8 used on 28 Sep), so delete an old backup if needed, with the owner's OK.
2. **Migrations** (only if `prisma/migrations` changed):
   ```bash
   DATABASE_URL="<PROD_DIRECT_URL>" npx prisma migrate status
   DATABASE_URL="<PROD_DIRECT_URL>" npx prisma migrate deploy
   ```
   Only additive migrations, and only with explicit approval.
3. **Seeds** (only if content changed), for example:
   ```bash
   npm run seed:skills -- --production
   npm run seed:skills-content -- --production
   ```
   These need `DATABASE_URL` pointed at production for that one command.
4. **Deploy:**
   ```bash
   git checkout main
   git merge --ff-only feat/skills-platform
   git push origin main
   git checkout feat/skills-platform
   ```
5. **Watch:** `vercel ls --prod` until the newest deploy is **Ready**.
6. **Mandatory checks:**
   ```bash
   curl https://vocalisai.vercel.app/api/health      # {"ok":true,"database":"reachable"}
   vercel logs https://vocalisai.vercel.app          # no errors
   ```
   Then load a signed-in page. Logged-out checks alone are not enough.
7. **Rollback if broken:** redeploy the previous deployment with `vercel rollback`, or promote it in the Vercel dashboard, Deployments. For data, restore from the backup branch in Neon.

## Vercel configuration
- **Project:** `vocalis-ai/vocalisai`. Framework Next.js (`vercel.json`); build `next build` (`npm run build`).
- **`.vercelignore`** excludes `.next`, `node_modules`, `uploads`, `.env`, `.env.local` and local database files.
- **Environment:** Production only (see SERVICES_AND_SECRETS.md). **`DATABASE_URL` is missing and should be re-added.** Preview has no variables.
