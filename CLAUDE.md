@AGENTS.md

# VocalisAi - working rules

Next.js 16 + React 19 + TypeScript 7 + Prisma 6 (Neon Postgres) + NextAuth, deployed on Vercel. Start with `docs/DEVELOPER_HANDOVER.md` (setup, "where do I change this?") and `docs/ARCHITECTURE.md`.

## The owner
- Non-technical. End each reply with a plain-language "what I did / what's left". When they must act, give literal, numbered steps (Windows PowerShell 5.1: `npm.cmd`/`npx.cmd`, one command per line).
- Their goal is paying subscribers: favour work that helps users and sales. Paid checkout (Paddle) is not live yet.
- Zero-cost for now: no new paid services; mention paid options once, with the price.

## Git and releases
- Work on `feat/skills-platform`. Commit in logical steps; you may push this branch. Never force-push; never rewrite history.
- **Pushing `main` deploys to production.** Only when the owner says **"ship to production"**, and only via `docs/DEPLOYMENT.md` (backup branch, migrations first, seeds, then push, then `/api/health` and `vercel logs`).
- The repo is **public**: never commit secrets, and don't describe unfixed security weaknesses in committed files.

## Database
- Additive, reversible migrations only; show the plan first. Never change production data without the owner's OK and a Neon backup branch.
- Scripts refuse production unless run with `--production`; never point `.env` at production. The old unguarded seeds (`prisma/seed.mjs`, `seed-admin.mjs`, ...) are for a fresh development database only.

## Checks before calling work done
- `npx tsc --noEmit` and the relevant `npx vitest run tests/unit/<file>.test.ts`; `npm test` for broad changes (it uses the shared Neon **test** branch via `.env.test`).
- UI changes: open the page (desktop and 390 px phone width).
- Before a release: `npm run build`, then `E2E_SERVER=start npx playwright test`, with no other test run or server on port 3000.
- `npm run lint` is broken (typescript-eslint vs TS 7) - see `docs/TECHNICAL_DEBT.md`.

## Don't break (details: `docs/DO_NOT_BREAK.md`)
- Candidates never see raw JSON, speaker labels (`S1:`), stack traces or provider errors. Passages go through `src/lib/question-stimulus.ts`; errors are logged and replaced by a plain sentence.
- AI replies are untrusted: parse with a zod schema via `parseGeminiJson()` before storing or showing.
- Paid work always goes through `checkAndRecordUsage()` (locked per user+feature) and `refundUsage()` on our own failures.
- Access: `src/proxy.ts` reads role/suspension from the database; admin routes call `requireAdmin()`; `[id]` routes check ownership.
- `src/lib/question-freshness.ts` (no repeated questions), `src/lib/db.ts` `resolveDatabaseUrl()`, `NEXTAUTH_SECRET` (changing it logs everyone out), the scoring rules in `src/lib/scoring-engine.ts`, and the `prisma/skills-content/*` generators (their order and seeds define the bank).

## Coding conventions
- Smallest change that does the job; don't refactor unrelated code alongside a feature.
- New or changed API routes: zod for the body, `{ error: "<plain sentence>" }` on failure, ownership checks on ids.
- Shared constants live in one place (`src/lib/plans-and-roles.ts`, `practice-taxonomy.ts`, `entitlements.ts`); browser code must not import server modules (`db`).
- UI: icons via `src/components/ui/Icon.tsx`, buttons via the shared classes in `globals.css`, every page usable at phone width.
