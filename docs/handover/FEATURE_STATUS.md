# Feature status (28 Sep 2026)

Evidence is code, tests and the Phase 5 walk-through (43 pages x laptop and phone, screenshots reviewed).

Legend:
- **COMPLETE**: built, tested, live.
- **MOSTLY COMPLETE**: works, with gaps listed.
- **PARTIALLY IMPLEMENTED**: some pieces missing.
- **NEEDS TESTING**: built, not fully proven.
- **NOT STARTED**
- **BUGGY**

Phase 5 fixes (the unscored empty exam and others) are on branch `feat/skills-platform` and **not live yet**. See CURRENT_STATE.md.

| Area | Status | Evidence / notes |
|---|---|---|
| **Candidate view**: dashboard, menus, pages | COMPLETE | `src/app/dashboard`, walkthrough.spec (no errors or overflow), `candidate-experience.spec.ts` |
| Signup / login / password reset | COMPLETE | `auth.spec.ts` |
| **Email-verified sign-up** (6-digit code, expiry, resend, limits) | COMPLETE on the branch, **not live** | `src/lib/email-verification.ts`, `email-verification.test.ts`, `auth.spec.ts`. Going live needs Gmail SMTP in Vercel. |
| Password-reset email on the live site | BUGGY (live) | Resend sandbox delivers only to the owner. Fixed by SMTP plus this release. |
| **Goal Tracks and onboarding** (Phase 4) | COMPLETE | `goal-tracks.ts`, `goals.spec.ts`. 3 enabled tracks; CAMPUS and STUDY_ABROAD hidden with no content. |
| **Skill-based practice**: My Skills, Quick Drills, "I'm weak in" diagnostics, mastery (Phase 2) | COMPLETE | `src/lib/skills/*`, `skills.spec.ts`, `skills-phase2.test.ts` |
| Practice library (17 modes) | COMPLETE | `practice-taxonomy.ts`, `practice-mcq.spec.ts`, `practice-voice.spec.ts` |
| **Question bank** (5,772 active, all skill-tagged) | COMPLETE | QUESTION_BANK.md; live audit 26 Sep |
| **Question uniqueness** (fresh first everywhere) | COMPLETE for code; content-limited | `question-freshness.ts`. Small pools (listening, writing, conversation roles) still repeat sooner; this needs more content. |
| **Exam-type categorisation and exam library** | COMPLETE on the branch, **not live** | 25 exams in 12 types (`prisma/exam-library/content.mjs`, `npm run seed:exam-library`); one card per exam; type filters; admins create new types. `exam-library.test.ts`, `exam-library.spec.ts`. The SELT, PTE, Cambridge and Employment families still have no exams. |
| Skill categorisation (12 categories, 302 skills) | MOSTLY COMPLETE | 8 visible. COG, DIN, BIZ and DGT are hidden with **no content**. |
| **Mock tests v1** (proctored, sections, report) | COMPLETE | `mock-test*.spec.ts`. Phase 5 fixed the "100 with nothing answered" scoring. |
| **Exam runner v2** (IELTS-style timed papers) | COMPLETE | `exam-runner.ts`, `exam-runner-v2*.spec.ts`, `exam-demo.spec.ts` (all passing on 28 Sep) |
| **Listening tests** (player, play limits, two voices) | COMPLETE | LISTENING_SYSTEM.md, `raw-data-guard.spec.ts`, `mock-test-rendering.spec.ts` |
| **Listening dialogue presentation** (no raw JSON, no S1/S2) | COMPLETE | `question-stimulus.ts`. Gap: import doesn't reject an unplayable listening spec. |
| **Audio generation** (pre-generated listening files) | PARTIALLY IMPLEMENTED | The script exists (`generate:question-audio`, Windows voices). Not every listening question has a generated file; the rest fall back to browser voices. |
| **TTS**: Listen buttons, accents | COMPLETE (free mode) | device voices; ElevenLabs built but off (no key) |
| **Question generation** (AI customer-service scenarios) | COMPLETE | `api/practice/questions/generate` (Gemini); now auto-tagged |
| **Question validation** (import) | MOSTLY COMPLETE | `question-validation.ts`, near-duplicate check, S1/S2 check. Missing: a playable-listening-spec check. |
| **Scoring** (category scores, weights, readiness, bands) | COMPLETE | `scoring-engine.test.ts`, `score-scales.test.ts` |
| **Results pages** (mock, v2 exam, speech analysis) | COMPLETE | walkthrough; Phase 5 fix for typed answers |
| Speech analysis (Groq + Gemini) | COMPLETE | needs both API keys |
| AI conversations (4 roles) | COMPLETE | needs Groq and Gemini, and a microphone |
| AI Coach | COMPLETE | Phase 5 fixed the phone scroll jump |
| Progress page | COMPLETE | |
| **Billing (Paddle)** | PARTIALLY IMPLEMENTED | Webhook and page exist; production lacks the client token, price IDs and webhook secret, so **checkout isn't live**. Admins set plans by hand. |
| **Admin view** (all screens) | COMPLETE | `admin-*.spec.ts`, walkthrough. The Candidates list has no paging (it gets long). |
| **Exam proctoring: one person in frame** | COMPLETE on the branch, **not live** | Real on-device detection (MediaPipe), a warning banner, and flags. `proctoring-people.spec.ts` covers the full flow with the real detector. |
| **UI/UX** (icons, buttons, phone layout) | COMPLETE | `icons.spec.ts`, `buttons.spec.ts`, walkthrough |
| **Publishing / deployment** | COMPLETE, with a caveat | Vercel auto-deploy from `main`; `/api/health`. **Vercel Production is missing `DATABASE_URL`** (running on the fallback). Preview deploys don't work (no env vars). |
| Lint (`npm run lint`) | BUGGY (tooling) | fails: `typescript-eslint` doesn't support TypeScript 7 |
| Campus / Study Abroad tracks | NOT STARTED | hidden in the seed |
| Content for hidden skill categories and other exam families | NOT STARTED | |
