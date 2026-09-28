# Next steps: prioritised roadmap (updated 28 Sep 2026, 22:30 IST)

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
   2. `npm test` (expect 330 passing)
   3. `npm run build`
   4. `E2E_SERVER=start npx playwright test` (see CURRENT_STATE.md for the last result, and re-check the exam specs listed there)
4. ~~Gmail sending for sign-up codes~~ **Done 28 Sep** (vocalisai.examia@gmail.com; `SMTP_*` settings in Vercel).
5. ~~Ship Phase 5, the exam library, email verification and the one-person camera check~~ **All live since 28 Sep** (see CURRENT_STATE.md).

## High priority

6. ~~Re-add `DATABASE_URL`~~ **Done 28 Sep** (Secret; active from the next deploy). Was: (the pooled production connection string). The site currently relies on the fallback. The owner may need step-by-step help, or it can be done with `vercel env add DATABASE_URL production`, with the owner pasting the value.
7. ~~Reject unplayable listening questions~~ **Done 28 Sep** (`validateListeningStimulus`). Was: (`src/lib/question-validation.ts`; see LISTENING_SYSTEM.md section 6). Add a unit test.
8. ~~More content where pools are small~~ **Done 28 Sep** (+395 questions, every area at 40+ per level once released). Was: This serves the owner's "no repeated questions" requirement. Check Admin, Question Bank coverage on the live site, then add items (listening, writing, fluency, interview, conversation roles) via `prisma/skills-content/` and `npm run seed:skills-content`, or admin import.
9. ~~Two-voice audio for listening~~ **Done 28 Sep** (263 already had it; 8 monologues converted and recorded at release). Was: that don't have it (free, Windows): `npm run generate:question-audio -- --dry-run`, then run it with `--production` after approval.

## Medium priority

10. **Billing go-live (owner's decision):** configure Paddle products, prices and webhook, then set the 5 missing variables in Vercel and test in sandbox first.
11. **Vercel Preview environment:** decide whether to copy the variables to Preview, pointed at the **staging** branch, or keep the local staging copy.
12. **Optional data tidy-up:** recompute old score reports for exams that had no scored answers (read-only count first; approval and backup before any write).
13. **Admin Candidates paging** (server-side `take`/`skip`) before the user count grows.

## Later

14. The CAMPUS and STUDY_ABROAD goal tracks (hidden, no content).
15. Content for the hidden skill categories (COG, DIN, BIZ, DGT), then turn on `skills_all_categories`.
16. Real exam content for the remaining exam families (SELT, PTE, Cambridge, Employment); only the catalogue exists. (Aptitude and 11 other types now have exams.)
17. ElevenLabs natural voices, if the owner decides to pay: add `ELEVENLABS_API_KEY`, no code change.
18. Clean-ups:
    - delete the unused `src/lib/question-selection.ts`;
    - clearer empty-exam results message;
    - rename `package.json` "proacting";
    - restore `npm run lint` when typescript-eslint supports TypeScript 7.
