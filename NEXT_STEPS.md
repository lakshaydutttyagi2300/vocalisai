# Next steps: prioritised roadmap (28 Sep 2026)

Everything here comes from the existing project, the owner's stated requirements and the issues found in inspection. It's not new wish-list items. Rules for all of it:
- work on `feat/skills-platform`;
- report after each step;
- deploy **only** on "ship to production";
- database changes are additive, with the migration plan shown first.

## Immediate: restore and continue

1. **Set up the new account** (MIGRATION_CHECKLIST.md): clone, `.env` files, `npm install`, Neon MCP.
2. **Read the handover:** `CLAUDE_NEW_ACCOUNT_START.md`, `CURRENT_STATE.md`, `docs/handover/*`.
3. **Run the gate** on the branch:
   1. `npx tsc --noEmit`
   2. `npm test` (expect 296 passing)
   3. `npm run build`
   4. `E2E_SERVER=start npx playwright test` (see CURRENT_STATE.md for the last result, and re-check the exam specs listed there)
4. **Ask the owner about shipping Phase 5.** The fixes (no more "100" for empty exams, phone layout fixes, question auto-tagging) are ready but not live. When the owner says **"ship to production"**, follow the release runbook in `docs/handover/GIT_AND_DEPLOYMENT.md`:
   - backup branch;
   - **no migration** this time;
   - fast-forward `main` and push;
   - `/api/health` and `vercel logs` checks.

## High priority

5. **Re-add `DATABASE_URL` in Vercel Production** (the pooled production connection string). The site currently relies on the fallback. The owner may need step-by-step help, or it can be done with `vercel env add DATABASE_URL production`, with the owner pasting the value.
6. **Reject unplayable listening questions at import/edit** (`src/lib/question-validation.ts`; see LISTENING_SYSTEM.md section 6). Add a unit test.
7. **More content where pools are small.** This serves the owner's "no repeated questions" requirement. Check Admin, Question Bank coverage on the live site, then add items (listening, writing, fluency, interview, conversation roles) via `prisma/skills-content/` and `npm run seed:skills-content`, or admin import.
8. **Generate two-voice audio for listening questions** that don't have it (free, Windows): `npm run generate:question-audio -- --dry-run`, then run it with `--production` after approval.

## Medium priority

9. **Billing go-live (owner's decision):** configure Paddle products, prices and webhook, then set the 5 missing variables in Vercel and test in sandbox first.
10. **Vercel Preview environment:** decide whether to copy the variables to Preview, pointed at the **staging** branch, or keep the local staging copy.
11. **Optional data tidy-up:** recompute old score reports for exams that had no scored answers (read-only count first; approval and backup before any write).
12. **Admin Candidates paging** (server-side `take`/`skip`) before the user count grows.

## Later

13. The CAMPUS and STUDY_ABROAD goal tracks (hidden, no content).
14. Content for the hidden skill categories (COG, DIN, BIZ, DGT), then turn on `skills_all_categories`.
15. Real exam content for the other exam families (SELT, PTE, Cambridge, Aptitude, Employment); only the catalogue exists.
16. ElevenLabs natural voices, if the owner decides to pay: add `ELEVENLABS_API_KEY`, no code change.
17. Clean-ups:
    - delete the unused `src/lib/question-selection.ts`;
    - clearer empty-exam results message;
    - rename `package.json` "proacting";
    - restore `npm run lint` when typescript-eslint supports TypeScript 7.
