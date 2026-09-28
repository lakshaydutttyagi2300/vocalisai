# External services, accounts and secrets

**No real values are written anywhere in this repository.** `<LIKE_THIS>` marks a value you copy from the service's dashboard or from your password manager.

## Where secrets live

| Place | File or location | Committed? | Used by |
|---|---|---|---|
| Local development | `.env` in the project root | **No** (ignored by git) | `npm run dev`, seed scripts, Playwright |
| Local tests | `.env.test` (copy of `.env.test.example`) | **No** | Vitest and Playwright. It must point at the Neon **test** branch. |
| Local staging copy | `.env.staging` (only `DATABASE_URL`) | **No** | `node scripts/dev-staging.mjs` |
| Vercel CLI | `.env.local` (holds `VERCEL_OIDC_TOKEN`) and `.vercel/project.json` | **No** | created by `vercel link` / `vercel env pull`; recreated automatically |
| Live site | Vercel dashboard, then vocalisai, Settings, Environment Variables, **Production** | n/a | the deployed app |
| Template | `.env.example` (committed, placeholders only) | yes | copy it to `.env` |

**Keep a private copy of `.env`, `.env.test` and `.env.staging` before this computer or account changes.** They are the only local record of the development, test and staging database addresses. You can recreate them from the Neon and Vercel dashboards if needed; the steps are below.

## Variables

| Variable | Needed for | Referenced in | In Vercel Production today? |
|---|---|---|---|
| `DATABASE_URL` = `<NEON_POOLED_CONNECTION_STRING>` | everything | `prisma/schema.prisma`, `src/lib/db.ts`, all `prisma/*.mjs` scripts | **NO**. It went missing on 26 Sep. The site runs through the `src/lib/db.ts` fallback to `DATABASE_URL_UNPOOLED`. **Re-add it** (pooled production URL). |
| `DATABASE_URL_UNPOOLED` = `<NEON_DIRECT_CONNECTION_STRING>` | fallback DB address, migrations | `src/lib/db.ts` | yes |
| `NEON_BRANCH` | informational (local `.env` only) | none in `src` | no |
| `NEXTAUTH_SECRET` = `<RANDOM_32+_CHARS>` | login sessions; also signs drill tokens | `src/lib/auth.ts`, `src/proxy.ts`, `src/lib/skills/drill-token.ts` | yes. **Never change it in production:** everyone would be logged out and drills in progress would fail. |
| `NEXTAUTH_URL` | NextAuth base URL (`http://localhost:3000` locally) | NextAuth | no (Vercel works it out) |
| `GROQ_API_KEY` = `<GROQ_API_KEY>` | speech-to-text of recordings | `src/lib/providers/groq-whisper-provider.ts` | yes |
| `GEMINI_API_KEY` = `<GEMINI_API_KEY>` | AI analysis, coach, conversation, reports, rewrites, scenarios | `src/lib/providers/gemini-*.ts` | yes |
| `SMTP_HOST` = `smtp.gmail.com`, `SMTP_PORT` = `465`, `SMTP_USER` = `<GMAIL_ADDRESS>`, `SMTP_PASSWORD` = `<GMAIL_APP_PASSWORD>` | **sign-up verification codes** and password resets (the owner chose Gmail, free, on 28 Sep) | `src/lib/email.ts` | **no. Must be added before the email-verified sign-up ships**, or nobody can register. |
| `EMAIL_FROM` | optional sender name/address, e.g. `VocalisAi <you@gmail.com>` | `src/lib/email.ts` | no |
| `EMAIL_DELIVERY` | optional: `smtp`, `resend` or `log`. The tests force `log`; "log" refuses on the live site. | `src/lib/email.ts`, `playwright.config.ts` | no |
| `RESEND_API_KEY` = `<RESEND_API_KEY>` | fallback email sender. **Sandbox only:** without a verified domain it delivers only to the owner's own inbox. | `src/lib/email.ts` | yes |
| `RESEND_FROM_EMAIL` | sender address | `src/lib/email.ts` (defaults to `onboarding@resend.dev`) | yes |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | recordings, generated audio, admin uploads, TTS cache | `src/lib/storage.ts` | yes (all four) |
| `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` or `production` | `src/lib/paddle.ts`, `src/app/billing/page.tsx` | yes |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` = `<PADDLE_CLIENT_TOKEN>` | Paddle checkout in the browser | `src/app/billing/page.tsx` | **no** (so checkout isn't live) |
| `NEXT_PUBLIC_PADDLE_PRICE_STARTER` / `_PROFESSIONAL` / `_PREMIUM` = `<PADDLE_PRICE_ID>` | plan prices | `src/lib/paddle.ts`, billing page | **no** |
| `PADDLE_WEBHOOK_SECRET` = `<PADDLE_WEBHOOK_SECRET>` | checks the Paddle webhook signature | `src/app/api/webhooks/paddle/route.ts` | **no** |
| `ELEVENLABS_API_KEY` = `<ELEVENLABS_API_KEY>` | natural voices (optional, paid) | `src/lib/tts/elevenlabs.ts`, `src/lib/tts/service.ts`, `prisma/generate-listening-voices.mjs` | **no, on purpose** (free mode) |
| `ELEVENLABS_MODEL_ID` | optional; default `eleven_flash_v2_5` | `src/lib/tts/elevenlabs.ts` | no |
| `ELEVENLABS_VOICE_<IN/US/UK>_<F/M>` | optional voice overrides | `src/lib/tts/elevenlabs.ts` | no |
| `ELEVENLABS_RESERVE_CREDITS` | optional; default 1000 credits kept back | `src/lib/tts/service.ts` | no |
| `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | last-resort fallbacks (Vercel-Neon integration names) | `src/lib/db.ts` | no |
| `E2E_SERVER=start` | test-only: Playwright runs against a production build | `playwright.config.ts` | n/a |
| `E2E_SCREENSHOT_DIR` | test-only: where specs save screenshots | `tests/e2e/*` | n/a |

`.env.local` holds `VERCEL_OIDC_TOKEN`. It was created by the Vercel CLI, is short-lived, and isn't used by the app code.

## Services, one by one

Do any "Rotate?" step only if you think a key has leaked. Moving to a new **Claude** account does **not** require rotating anything.

### 1. Neon (PostgreSQL database)

| | |
|---|---|
| Purpose | All app data: users, questions, attempts, exams, scores |
| Account | Your Neon account (not tied to Claude). Project **VoiceisAI**, ID `plain-art-88027021`, region AWS US East 2. **Free plan: 10-branch limit.** |
| Branches | **production** `br-fragrant-hill-b4zjhhml` (the live site). **development** `br-misty-forest-b4jew56p` (the local `.env`). **test** `br-frosty-morning-b4fnpxlh` (`.env.test`, automated tests only). **staging** `br-polished-bread-b45agu4c` (`.env.staging`, a copy of live for manual testing). **Backups** (restore points, taken from production): `backup-production-before-phase4-goals`, `-before-question-bank`, `-before-skills-platform`, `-before-speaker-label-fix`. |
| Depends on it | Everything |
| Credentials | Connection strings (Neon dashboard, Branch, Connect). Use the **pooled** one for `DATABASE_URL` and the direct one for `DATABASE_URL_UNPOOLED`. |
| New dev environment | Copy the connection strings into `.env`, `.env.test` and `.env.staging`. |
| Claude-related | The **Neon MCP server** is configured in *this computer's* `~/.claude.json` with a Neon API key (see CLAUDE_CODE_SETUP.md). The new Claude session needs it added again. The Neon account itself is unaffected. |
| Data-loss risk | None from a Claude account change. |

### 2. Vercel (hosting)

| | |
|---|---|
| Purpose | Builds and serves https://vocalisai.vercel.app |
| Account | Team **vocalis-ai**, project **vocalisai**, linked to the GitHub repo. Not tied to Claude. |
| Behaviour | **Every push to `main` deploys to production automatically.** The build is `next build` only: **no database migration runs.** Preview deployments have **no** environment variables, so they don't work (a known limitation). |
| Credentials | Production env vars listed above, set in the Vercel dashboard. The Vercel CLI login on this computer (`vercel login`) is per machine. |
| Claude-related | The claude.ai "Vercel" connector returned 403 for this team, so the CLI was used instead. Nothing to migrate. |
| Setup | `npm i -g vercel`, `vercel login`, `vercel link` (choose vocalis-ai / vocalisai). |

### 3. GitHub

| | |
|---|---|
| Purpose | Source code; triggers Vercel deploys |
| Repo | https://github.com/lakshaydutttyagi2300/vocalisai (**public**). Branches: `main` (= live), `feat/skills-platform` (current work), `design/premium-dashboard-concept` (an old visual concept that was never merged; see GIT_AND_DEPLOYMENT.md). |
| Credentials | Your GitHub login and the `gh` CLI login (`gh auth login`) on this machine. No repository secrets or Actions are used. |
| Claude-related | None. Git pushes go through your own GitHub login. |

### 4. Cloudflare R2 (file storage)

| | |
|---|---|
| Purpose | Candidate voice recordings, admin uploads (item-group audio/images), generated listening audio (`question-audio/*`), TTS cache (`tts/<hash>.mp3`) |
| Where | `src/lib/storage.ts`, `api/practice/recordings/*`, `api/admin/item-groups/assets/*`, `api/questions/[id]/audio`, `api/tts/*` |
| Credentials | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (Cloudflare dashboard, R2, API tokens) |
| Setup | The bucket CORS must allow `https://vocalisai.vercel.app` and `http://localhost:3000` for PUT and GET. The rules are in `r2-cors.json` (`wrangler r2 bucket cors set <bucket> --file r2-cors.json`). |
| Data-loss risk | None from a Claude change. The local `uploads/` folder (about 91 MB, ignored by git) holds only local-dev fallback files. |

### 5. Groq (speech-to-text)
- **Model and use:** `whisper-large-v3-turbo`, used by speech analysis and AI conversations.
- **Key:** `GROQ_API_KEY`, from console.groq.com.
- **Not tied** to Claude or GitHub.

### 6. Google Gemini (AI text)
- **Models:** `gemini-2.5-flash` / `-flash-lite` and newer lite models (see `src/lib/providers/pricing.ts`).
- **Key:** `GEMINI_API_KEY`, from Google AI Studio.
- **Uses:** speech analysis, coach, conversation turns and summary, AI report, "Improve my answer", AI-generated scenarios.
- **If it's missing,** those features show an error; the rest of the app works.

### 7. Email: Gmail SMTP (primary) and Resend (fallback)
- **Use:** sign-up verification codes (new) and password resets.
- **Gmail SMTP** (owner's choice, free, about 500 emails a day):
  1. On the Gmail account, turn on 2-Step Verification.
  2. Create an **App Password** at https://myaccount.google.com/apppasswords.
  3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<gmail address>` and `SMTP_PASSWORD=<app password>` in Vercel Production (and in `.env` to test locally).
  - It's tied to the owner's Google account, not to Claude.
- **Resend:** used only when SMTP isn't set. Without a verified domain (which costs money) it can only deliver to the Resend account owner's inbox. That is why, **on the live site today, password-reset emails reach nobody but the owner.** Adding SMTP fixes that too.
- **Local development without SMTP:** codes and reset links are printed in the server console (`EMAIL_DELIVERY=log`).

### 8. Paddle (billing), **not fully set up**
- **What exists:** webhook `POST /api/webhooks/paddle`, which checks the signature and sets the plan.
- **Missing in production:** the Paddle client token, price IDs and webhook secret. **So paid checkout is not live.**
- **What works today:** plans are set by an admin (Admin, Candidates, Plan).
- **To go live:** create the products and prices in Paddle, then set the missing variables in Vercel. Add the webhook URL `https://vocalisai.vercel.app/api/webhooks/paddle` in Paddle, with its secret in `PADDLE_WEBHOOK_SECRET`.

### 9. ElevenLabs (natural voices), **off on purpose**
- **Why off:** the owner chose not to pay (26 Sep 2026), and the free plan can't be used commercially.
- **What happens instead:** the app uses the best voice on the user's device.
- **To turn on:** add `ELEVENLABS_API_KEY` in Vercel. No code change is needed.
- **Built-in limits:**
  - daily listens per plan (FREE 5, STARTER 25, PROFESSIONAL 60, PREMIUM 120);
  - a credit reserve;
  - the `NATURAL_VOICES` flag;
  - cached clips in R2 (`tts/`).

### 10. Unsplash images
- `next.config.mjs` allows `images.unsplash.com` for landing-page photos.
- No key is needed.

### 11. Windows voices (dev-machine only)
- `npm run generate:question-audio` uses the built-in speech voices of a **Windows** PC to make listening audio, then uploads it to R2.
- It isn't needed at runtime.

## Anything tied to the current Claude account?

**No application service is tied to your Claude account.** These are tied to Claude:
- the Neon MCP connection in `~/.claude.json`, which holds a Neon API key;
- any claude.ai connectors (Neon, Vercel, Figma, and others) enabled on the old account;
- Claude's local memory notes and conversation history.

CLAUDE_CODE_SETUP.md covers all three.
