# VocalisAi

AI-powered English, workplace and interview preparation with proctored mock exams: https://vocalisai.vercel.app

Candidates practise questions in 17 modes, run skill drills with mastery tracking, follow a goal track (General English, BPO / Customer Support, Interview Prep, Campus Placement, Study Abroad), take camera-checked mock exams including IELTS-style timed papers, get AI analysis of their spoken answers, rehearse with AI role-play conversations and chat with an AI coach. Plans (Free, Starter, Professional, Premium) set monthly usage limits. Admins manage the question bank, exams, candidates, plans and settings.

## Technology

- **Next.js 16** (App Router, full-stack), React 19, TypeScript 7, Tailwind CSS 4
- **PostgreSQL** on Neon, through **Prisma 6**
- **NextAuth** (email + password, email-verified sign-up)
- **Groq** Whisper (speech-to-text) and **Google Gemini** (analysis, coach, conversations)
- **Cloudflare R2** (recordings and media), **Gmail SMTP** (email), **Paddle** (billing, not live yet)
- Hosted on **Vercel**; tests with **Vitest** and **Playwright**

## Quick start

Requires Node.js 24 and access to the project's Neon database branches.

```bash
npm install
cp .env.example .env            # fill in: see docs/SERVICES_AND_SECRETS.md
cp .env.test.example .env.test  # the Neon *test* branch
npm run dev                     # http://localhost:3000
```

Check http://localhost:3000/api/health returns `{"ok":true,"database":"reachable"}`. Full setup: [docs/DEVELOPER_HANDOVER.md](docs/DEVELOPER_HANDOVER.md).

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npx tsc --noEmit` | Type check |
| `npm test` | Unit tests (Vitest, against the Neon test branch) |
| `npm run build` | Production build |
| `E2E_SERVER=start npx playwright test` | Browser tests against a production build (run `npm run build` first) |
| `npm run seed:skills`, `seed:skills-content`, `seed:exam-library` | Content loaders (idempotent) |

## Project layout

```
src/app/         pages and API routes (src/app/api)
src/components/  React components (shared UI in components/ui)
src/lib/         business logic: access, plans, questions, exams, scoring, AI providers
src/proxy.ts     request guard (sign-in, suspension, admin role)
prisma/          schema, migrations, seeds and question-bank content
tests/           unit (Vitest) and e2e (Playwright)
docs/            documentation
```

## Documentation

| Document | Read it for |
|---|---|
| [docs/DEVELOPER_HANDOVER.md](docs/DEVELOPER_HANDOVER.md) | **Start here**: setup, where to change things, workflow, common problems |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system fits together and the main data flows |
| [docs/API.md](docs/API.md) | Every endpoint, who can call it, key request/response formats |
| [docs/DATABASE.md](docs/DATABASE.md) | Entities, conventions, migrations, seeds |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Branches and the production release runbook |
| [docs/SERVICES_AND_SECRETS.md](docs/SERVICES_AND_SECRETS.md) | External services and environment variables |
| [docs/DO_NOT_BREAK.md](docs/DO_NOT_BREAK.md) | Working features and the tests that protect them |
| [docs/TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md) | Known issues and recommended next steps |
| [docs/DECISION_LOG.md](docs/DECISION_LOG.md) | Why things are built the way they are |
| [docs/QUESTION_BANK.md](docs/QUESTION_BANK.md), [docs/LISTENING_SYSTEM.md](docs/LISTENING_SYSTEM.md) | The question bank and listening audio |
| [CHANGES.md](CHANGES.md) | Change history, phase by phase |
| [CLAUDE.md](CLAUDE.md) | Project rules for AI coding assistants |

## Deployment

Every push to `main` deploys to production on Vercel, and the build does not run database migrations. Work on a branch and release only through the runbook in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## License

Proprietary. All rights reserved (`"license": "UNLICENSED"`). The source is publicly visible, but it may not be copied or reused without permission.
