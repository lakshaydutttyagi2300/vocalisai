# API reference

Every endpoint is a Next.js route handler in `src/app/api/**/route.ts` (the URL is the folder path). There is no separate backend and no API versioning: the app's own pages are the only clients, apart from the Paddle webhook.

## Conventions

- **JSON in, JSON out.** Failures return `{ "error": "<plain sentence safe to show the candidate>" }`. Internal details (stack traces, provider errors, raw AI output) are logged on the server and never returned.
- **Status codes:** `400` bad input · `401` not signed in · `403` not allowed (wrong role, suspended, feature switched off, or **plan limit reached**, with an upgrade message) · `404` not found **or not yours** (ownership failures deliberately look like "not found") · `409` conflict with current state (e.g. an assessment that has ended) · `422` input understood but unusable (e.g. a silent recording) · `429` rate-limited (with `Retry-After`) · `502` an AI provider failed · `503` a service isn't configured.
- **Access levels** (enforced on the server, never only in the UI):
  - **public**: no session needed;
  - **signed-in**: `src/proxy.ts` requires a valid, non-suspended account, and the route reads the user from the session;
  - **owner**: signed-in, and the route checks the `[id]` belongs to that user;
  - **admin**: `src/proxy.ts` checks the role in the database and the route calls `requireAdmin()`.
- **Plan limits:** routes marked with a plan feature call `checkAndRecordUsage()` before doing paid work, and `refundUsage()` if that work then fails on our side. See `src/lib/entitlements.ts`.
- **Validation:** newer routes parse the body with a zod schema (e.g. `api/profile`); older ones check each field by hand. New or changed routes should use zod.

## All endpoints

| Endpoint | Methods | Access | Plan feature |
|---|---|---|---|
| **Auth** | | | |
| `/api/auth/[...nextauth]` | GET, POST (NextAuth) | public | |
| `/api/auth/signup` | POST | public | |
| `/api/auth/signup/verify` | POST | public | |
| `/api/auth/signup/resend` | POST | public | |
| `/api/auth/forgot-password` | POST | public | |
| `/api/auth/reset-password` | POST | public | |
| **Candidate: profile, goal, plan** | | | |
| `/api/profile` | GET, PATCH | signed-in | |
| `/api/goal` | POST | signed-in | |
| `/api/billing/usage` | GET | signed-in | |
| **Practice** | | | |
| `/api/practice/questions` | GET | signed-in | |
| `/api/practice/questions/generate` | POST | signed-in | `AI_SCENARIO` |
| `/api/practice/attempts` | POST | signed-in | `PRACTICE_SESSION` or `VOICE_RECORDING` (not for mock-exam answers or drill answers already charged) |
| `/api/practice/attempts/[id]/analyze` | GET, POST | owner | `SPEECH_ANALYSIS` (POST) |
| `/api/practice/attempts/[id]/improve` | GET, POST | owner | `IMPROVE_ANSWER` (POST) |
| `/api/practice/recordings` | POST | signed-in | |
| `/api/practice/recordings/presign` | POST | signed-in | |
| `/api/practice/recordings/complete` | POST | signed-in | |
| `/api/practice/recordings/[id]` | GET | owner | |
| `/api/questions/[id]/audio` | GET | signed-in | |
| **Skills** | | | |
| `/api/skills/drill` | GET | signed-in | `PRACTICE_SESSION` (once per drill) |
| `/api/skills/diagnostic` | GET | signed-in | `PRACTICE_SESSION` (once per diagnostic) |
| **Mock exams (v1)** | | | |
| `/api/mock-tests/options` | GET | signed-in | |
| `/api/mock-tests/sessions` | POST | signed-in | `MOCK_ASSESSMENT` |
| `/api/mock-tests/sessions/[id]` | PATCH | owner | |
| `/api/mock-tests/sessions/[id]/events` | GET, POST | owner | |
| `/api/mock-tests/sessions/[id]/score` | GET | owner | (analysis is covered by the assessment) |
| `/api/mock-tests/sessions/[id]/summary` | GET | owner | |
| `/api/mock-tests/sessions/[id]/report` | GET, POST | owner | |
| **Timed exams (v2)** — all go through `guardExamSession()` | | | |
| `/api/exam-sessions/[id]` | GET | owner | |
| `/api/exam-sessions/[id]/start` | POST | owner | |
| `/api/exam-sessions/[id]/response` | PUT | owner | |
| `/api/exam-sessions/[id]/advance` | POST | owner | |
| `/api/exam-sessions/[id]/submit-paper` | POST | owner | |
| `/api/exam-sessions/[id]/audio-play` | POST | owner | |
| `/api/exam-sessions/[id]/assets/[groupId]` | GET | owner | |
| **AI conversation and coach** | | | |
| `/api/conversations` | POST | signed-in | `INTERVIEW_SIMULATION` |
| `/api/conversations/[id]` | GET | owner | |
| `/api/conversations/[id]/turns` | POST | owner | |
| `/api/conversations/[id]/complete` | POST | owner | |
| `/api/coach/messages` | GET, POST | signed-in | `COACH_MESSAGE` (POST) |
| `/api/coach/profile` | GET | signed-in | |
| **Voices** | | | |
| `/api/tts` | POST | signed-in | daily voice limit (`src/lib/tts/service.ts`) |
| `/api/tts/audio/[id]` | GET | signed-in | |
| **Admin** (all call `requireAdmin()`; changes are written to `AdminAuditLog`) | | | |
| `/api/admin/overview` | GET | admin | |
| `/api/admin/users` | GET | admin | |
| `/api/admin/candidates` | POST | admin | |
| `/api/admin/candidates/[id]` | GET, PATCH, DELETE | admin | |
| `/api/admin/questions` | GET, POST | admin | |
| `/api/admin/questions/[id]` | GET, PATCH, DELETE | admin | |
| `/api/admin/questions/[id]/duplicate` | POST | admin | |
| `/api/admin/questions/bulk` | PATCH | admin | |
| `/api/admin/questions/export` | GET | admin | |
| `/api/admin/questions/template` | GET | admin | |
| `/api/admin/questions/validate` | POST | admin | |
| `/api/admin/item-groups` | GET, POST | admin | |
| `/api/admin/item-groups/[id]` | GET, PATCH, DELETE | admin | |
| `/api/admin/item-groups/assets` | POST | admin | |
| `/api/admin/item-groups/assets/presign` | POST | admin | |
| `/api/admin/item-groups/assets/complete` | POST | admin | |
| `/api/admin/exam-catalogue` | GET | admin | |
| `/api/admin/exam-catalogue/[entity]` | POST | admin | |
| `/api/admin/exam-catalogue/[entity]/[id]` | PATCH, DELETE | admin | |
| `/api/admin/templates` | GET, POST | admin | |
| `/api/admin/templates/[id]` | PATCH, DELETE | admin | |
| `/api/admin/features` | GET, PATCH | admin | |
| `/api/admin/scoring-weights` | GET, PATCH | admin | |
| `/api/admin/audit-log` | GET | admin | |
| **System** | | | |
| `/api/health` | GET | public | |
| `/api/system-check/ping` | GET | public | |
| `/api/webhooks/paddle` | POST | public, Paddle signature required | |

## Key contracts

### Sign-up (three steps; the account is only created in step 2)

| Call | Body | Success | Notable failures |
|---|---|---|---|
| `POST /api/auth/signup` | `{ name (2-100), email, password (8-200) }` | `202 { verificationRequired: true, email, expiresInSeconds, resendInSeconds }` | `400` invalid field or a domain that can't receive mail · `409` email already registered · `429` too many attempts or a code was just sent (`retryAfterSeconds`) · `502` the email couldn't be sent |
| `POST /api/auth/signup/verify` | `{ email, code }` (6 digits) | `201 { id, email }` | `400` wrong code (says how many tries are left) · `404` no sign-up waiting for this email · `410` code expired · `429` too many wrong codes |
| `POST /api/auth/signup/resend` | `{ email }` | `200 { email, expiresInSeconds, resendInSeconds }` | `404` no sign-up waiting · `429` cooldown or hourly limit |

The code is stored only as a hash and is never returned. Logic: `src/lib/email-verification.ts`.

### `GET /api/practice/questions?category=&difficulty=&count=`
Returns `{ questions: [...] }` (at most 10), unseen questions first (`question-freshness.ts`). Correct answers are **not** included; passages go through `question-stimulus.ts`, so candidates never see raw JSON or speaker IDs. `403` if the difficulty isn't on the user's plan or the category is switched off.

### `POST /api/practice/attempts`
Body: `{ questionId, timeTakenSeconds, responseText?, recordingId?, mockTestSessionId?, drillToken? }`.
- `recordingId` and `mockTestSessionId` must belong to the caller (`400` otherwise).
- Charges `VOICE_RECORDING` (with a recording) or `PRACTICE_SESSION` (without), except for answers inside a mock assessment (charged when it started) or a drill token covering the question.
- Mock-assessment answers are capped at the template's question count and refused more than 10 minutes after the assessment ended (`409`).
- Returns `{ attemptId, isCorrect, score, correctAnswer, explanation, scoringCriteria, distractorReason, skillId, mastery }`. `isCorrect`/`score` are `null` for questions with no fixed answer.

### Recording upload
1. `POST /api/practice/recordings/presign` `{ mimeType }` → `{ mode: "direct", recordingId, key, uploadUrl }` (upload the file to R2 with `PUT uploadUrl`), or `{ mode: "server" }` when R2 isn't configured (then upload to `POST /api/practice/recordings` instead).
2. `POST /api/practice/recordings/complete` `{ recordingId, key, mimeType, durationSeconds }` confirms the upload and creates the `PracticeRecording` row.

The browser side of this lives in `src/lib/upload-recording-client.ts`.

### `POST /api/practice/attempts/[id]/analyze`
Runs transcription + AI analysis once per attempt (a second call returns the stored result). Returns `{ analyzed: true, result }`. `422` if the recording has no speech (the use counts); `502`/`503`/`404` for our failures (the use is refunded).

### `POST /api/mock-tests/sessions`
Body: `{ templateId?, anyVersion? }` (from `GET /api/mock-tests/options`). Charges `MOCK_ASSESSMENT`. Returns `{ sessionId, template: { id, name, sections }, runner: "v1" | "v2" }`.

### `GET /api/mock-tests/sessions/[id]/score`
Analyses any unanalysed recordings in the session, then returns the category scores and overall readiness (`scoring-engine.ts`). Recomputed on every call, so admin weight changes apply.

### Conversations
- `POST /api/conversations` `{ role, difficulty }` → `{ sessionId, role, scenario, ... }` (charges `INTERVIEW_SIMULATION`).
- `POST /api/conversations/[id]/turns` `{ recordingId }` → `{ candidateTurn, aiTurn, reachedMaxTurns }`. At most 3 candidate turns on FREE and 4 on paid plans (`400`/`403` after that).
- `POST /api/conversations/[id]/complete` → `{ analysis }` (Gemini summary, validated before it's saved).

### `PATCH /api/profile`
Body (all optional): `{ name (2-100), targetRole (≤120), bio (≤2000) }`; only the fields sent change. Returns `{ ok: true }`.

### `GET /api/admin/users?search=&role=&status=&page=&pageSize=`
Returns `{ users, total, page, pageSize }` (page size 25 by default, at most 100).

### `PATCH /api/admin/candidates/[id]`
Body: any of `{ plan, role, isActive }`. The whole request is validated before anything changes; an admin can't change their own role or suspend themselves. Returns the updated candidate detail.

### `GET /api/health`
`200 { ok: true, database: "reachable" }` or `503 { ok: false, database: "unreachable" }`. Public; checked after every deploy.

### `POST /api/webhooks/paddle`
Called by Paddle, not the app. Verifies the `Paddle-Signature` header with `PADDLE_WEBHOOK_SECRET`, then sets the user's plan with `setPlan()`.
