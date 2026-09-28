READ THIS FILE BEFORE MODIFYING ANY CODE.

# Briefing for the new Claude Code session: VocalisAi

You are continuing a project another Claude account built with this owner up to 28 Sep 2026. That account has expired; this file and `docs/handover/` carry its full context. **Don't change anything until you've read this file, `CURRENT_STATE.md` and `NEXT_STEPS.md`, and reported the state back to the owner.**

## 1. The owner and how to work with them
- **Non-technical owner.** End every reply with a short plain-language "What I did / What's left". When they must act, give numbered, copy-paste steps.
- **Phases:** work in phases on branch `feat/skills-platform`, and stop and report after each one.
- **Git:** there is standing permission to commit and **push the branch** (the owner works on two laptops). Never force-push.
- **Deploying:** pushing `main` = deploying live, and happens **only** when the owner types **"ship to production"**. Then follow the runbook in `docs/handover/GIT_AND_DEPLOYMENT.md`, including the post-deploy `curl https://vocalisai.vercel.app/api/health` and `vercel logs` checks.
- **Database:** additive, reversible Prisma migrations only. Show the migration plan first. Never touch production data without approval and a Neon backup branch.
- **Secrets:** server-side env vars only; never in code or the browser. **The GitHub repo is PUBLIC.**
- **Money:** zero-cost for now. ElevenLabs stays off; mention paid options only as optional, with the price.
- **Preview deploys don't work** (no env vars). Test with the local staging copy: `.claude/launch.json`, entry `staging-test`.
- **Vercel:** use the CLI (`vercel env ls`, `vercel logs`, `vercel ls --prod`), not the owner's UI skills. Treat any missing core env var as a blocker and say so immediately.
- Save the notes in `docs/handover/CLAUDE_CODE_SETUP.md` ("Established way of working" and "Memory notes") into your memory.

## 2. What the app is
**VocalisAi** (https://vocalisai.vercel.app) is an English, workplace and interview preparation platform. It has:
- practice in 17 modes;
- skill drills and diagnostics with mastery scores;
- Goal Tracks (General English, BPO / Customer Support, Interview Prep);
- proctored mock exams, including IELTS-style timed papers;
- AI speech analysis (Groq Whisper + Gemini);
- AI voice role-play conversations and an AI coach;
- plans with usage limits;
- a full admin area (question bank, exams, templates, candidates, features, scoring weights, audit log).

## 3. Architecture (details in `docs/handover/ARCHITECTURE.md`)
- **Next.js 16 App Router** + React 19 + TypeScript 7 + Tailwind 4. **This is NOT the Next.js you know:** read `AGENTS.md` and `node_modules/next/dist/docs/` first. `src/proxy.ts` replaces middleware.
- **Prisma 6 + Neon Postgres.** Branches: production, development (`.env`), test (`.env.test`, used by the tests), staging (`.env.staging`).
- **Other services:**
  - NextAuth v4 (credentials, JWT);
  - Cloudflare R2 for files (local `uploads/` fallback);
  - Resend (email);
  - Paddle (billing, not live);
  - Vercel (auto-deploys `main`).
- **Business logic** is in `src/lib/`, the API in `src/app/api/`, and the tests in `tests/unit` (Vitest, 296) and `tests/e2e` (Playwright, 39).

## 4. Done / in progress / broken
- **Done and live:** Phases 1-4 of the skills platform, the 5,772-question bank with fresh-first selection, free-mode voices, the DB hotfix and `/api/health`.
- **Done on the branch, not live:** the Phase 5 QA fixes (see `CURRENT_STATE.md`).
- **Broken or gaps:** `docs/handover/KNOWN_ISSUES.md`. Top items:
  1. Vercel Production lacks `DATABASE_URL`; it runs on the fallback.
  2. Paddle checkout isn't configured.
  3. Unplayable listening specs can be imported.
  4. Some small question pools.
  5. `npm run lint` is broken (TypeScript 7).

## 5. Do NOT change unnecessarily (full list in `docs/handover/DO_NOT_BREAK.md`)
- `src/lib/question-stimulus.ts`: the **only** way question passages reach candidates. Raw JSON and S1/S2 labels must never be shown.
- `src/lib/question-freshness.ts`: no repeated questions; every activity uses it.
- `src/lib/db.ts` `resolveDatabaseUrl`: it keeps the live site up.
- `NEXTAUTH_SECRET`: changing it logs everyone out and breaks drill tokens.
- `src/lib/scoring-engine.ts` rules. Proctoring integrity must never score on its own.
- `prisma/skills-content/*` generators: changing their order or random seed re-creates the bank.
- The v1 mock exam, and the `exam_runner_v2` flag (ON in production).
- The existing migrations. Never edit an applied migration; add a new one.

## 6. Key decisions (full list in `docs/handover/DECISION_LOG.md`)
- Additive migrations.
- Deploy only on "ship to production".
- Test via the local staging copy.
- Mandatory health and log checks after each deploy.
- Free mode (device voices).
- One place converts stimulus for candidates.
- Fresh-first selection built from attempt history.
- The question bank is stored as code.
- The skills taxonomy is the backbone (8 of 12 categories visible).
- Mastery uses a 14-day half-life.
- One drill costs one session.
- The v2 runner applies only to linked templates.
- Flags fail open.

## 7. User and UX requirements to keep
- Candidates must never see internal data (JSON specs, speaker IDs, stack traces).
- No repeated questions across tests, drills and practice until a pool is used up.
- Every page must work on a phone (390px): no sideways scrolling. The walkthrough spec checks this.
- One icon set (`components/ui/Icon`) and one button system (`btn-primary`, `btn-secondary`, ...). `icons.spec` and `buttons.spec` check these.
- Plain, friendly wording; never show "not set up" technical messages to candidates.

## 8. Run and test
```bash
npm install
npm run dev                         # http://localhost:3000 (needs .env)
npx tsc --noEmit                    # type gate
npm test                            # unit (needs .env.test -> Neon TEST branch)
npm run build
E2E_SERVER=start npx playwright test   # after build; the dev server runs out of memory on this 8 GB PC
```
Before any e2e run:
- make sure **no other node/Playwright process** is running (a leftover run corrupted results on 28 Sep);
- make sure port 3000 is free.

Full setup: `docs/handover/SETUP_GUIDE.md`.

## 9. Important files
| What | Where |
|---|---|
| History, phase by phase | `CHANGES.md` |
| Current snapshot / roadmap | `CURRENT_STATE.md`, `NEXT_STEPS.md` |
| Services and env vars | `docs/handover/SERVICES_AND_SECRETS.md` |
| Question bank / listening | `docs/handover/QUESTION_BANK.md`, `docs/handover/LISTENING_SYSTEM.md` |
| Schema | `prisma/schema.prisma` |
| Skills | `src/lib/skills/` (taxonomy, mastery, drills, question-tags) |
| Goal tracks | `src/lib/goal-tracks.ts` |
| Exams | `src/lib/exam-runner.ts`, `src/app/api/mock-tests/`, `src/app/api/exam-sessions/` |
| Scoring | `src/lib/scoring-engine.ts`, `src/lib/score-scales/` |
| TTS | `src/lib/tts/`, `src/components/speech/` |
| Admin | `src/app/admin/`, `src/app/api/admin/` |
| Dev servers | `.claude/launch.json` |

## 10. What to do first
1. Run `git status` and `git log --oneline -3`. You should be on `feat/skills-platform` with the handover commit on top and a clean tree.
2. Run the gate: `npx tsc --noEmit`, `npm test`, `npm run build`, `E2E_SERVER=start npx playwright test`. Report the results in plain language.
3. Ask the owner whether to **"ship to production"** the Phase 5 fixes. Then follow the runbook (no migration is needed).
4. Offer to help re-add `DATABASE_URL` in Vercel Production (NEXT_STEPS.md, item 5).
