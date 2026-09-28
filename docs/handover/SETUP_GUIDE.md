# Setup guide: a fresh computer or account

Tested on the current machine: Windows 11, Node **v24.19.0**, npm **11.17.0**, Git **2.55**. The commands work in Git Bash or PowerShell unless noted. (In PowerShell, run `npm.cmd` / `npx.cmd` if `npm` is blocked by execution policy.)

## 1. Clone the repository

```bash
git clone https://github.com/lakshaydutttyagi2300/vocalisai.git
cd vocalisai
git checkout feat/skills-platform
```

The working branch is `feat/skills-platform`. `main` is what's live.

## 2. Install the software

- **Node.js 24** (nodejs.org)
- **Git**
- Optional:
  - GitHub CLI `gh` (`gh auth login`);
  - Vercel CLI (`npm i -g vercel`, then `vercel login` and `vercel link`, choosing team **vocalis-ai** and project **vocalisai**).
- **Claude Code**: the Claude desktop app (Code tab), or `npm i -g @anthropic-ai/claude-code` and then `claude`.

## 3. Install dependencies

```bash
npm install
npx playwright install chromium
```

`npm install` also runs `prisma generate` (the `postinstall` script). The first command downloads the `xlsx` package from cdn.sheetjs.com, so an internet connection is needed.

## 4. Environment files (never commit these)

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Fill them in using SERVICES_AND_SECRETS.md:
- **`.env`** (development):
  - `DATABASE_URL` = the Neon **development** branch (pooled), plus `DATABASE_URL_UNPOOLED` (direct);
  - `NEXTAUTH_SECRET` (any long random string locally);
  - `NEXTAUTH_URL=http://localhost:3000`;
  - `GROQ_API_KEY`, `GEMINI_API_KEY`;
  - `R2_*` (or leave them blank to store files in `uploads/`);
  - `RESEND_*`, and the Paddle values if you have them.
  - Leave `ELEVENLABS_API_KEY` blank (free mode).
- **`.env.test`**: `DATABASE_URL` = the Neon **test** branch, **never** development or production. Add any `NEXTAUTH_SECRET` and `NEXTAUTH_URL="http://localhost:3000"`.
- **`.env.staging`** (optional, for the local staging copy): one line, `DATABASE_URL=<NEON_STAGING_POOLED_URL>`. `scripts/dev-staging.mjs` refuses to start unless the host is the staging endpoint (`ep-wispy-firefly-b4l47um3`).

## 5. Databases (Neon project VoiceisAI, `plain-art-88027021`)

The branches already exist and hold data. You only need their connection strings: Neon dashboard, Branches, pick a branch, **Connect**.

If you ever need to rebuild the development database from scratch:

```bash
npx prisma migrate deploy      # applies prisma/migrations to DATABASE_URL
node prisma/seed.mjs           # original seed
npm run seed:skills            # skills taxonomy, goal tracks, blueprints
npm run seed:skills-content    # the large question bank
```

To seed an admin account, see `prisma/seed-admin.mjs`, or make yourself admin in Admin, Candidates, Role. Other optional seeds: `seed-mock-test-template*.mjs`, `npm run seed:exam-demo`.

**Scripts refuse the production database** unless you pass `--production`. Never point `.env` at production.

## 6. External services
See SERVICES_AND_SECRETS.md. For local development you need Neon, Groq and Gemini. R2, Resend and Paddle are optional locally.

## 7. Claude Code
See CLAUDE_CODE_SETUP.md. In short:
1. Open the folder in Claude Code.
2. Re-add the Neon MCP server.
3. Paste the memory notes.
4. Ask Claude to read `CLAUDE_NEW_ACCOUNT_START.md`.

## 8. MCP / connectors

```bash
claude mcp add --transport http --scope user Neon https://mcp.neon.tech/mcp --header "Authorization: Bearer <NEON_API_KEY>"
claude mcp list
```

Optionally reconnect the Neon, Vercel and Figma connectors in claude.ai, Settings, Connectors. None are required to run the app.

## 9. Start the development server

```bash
npm run dev
```

Open http://localhost:3000. In the Claude desktop app, use the launch config `proacting-dev`. Other entries:
- `proacting-prod`: `npm run start` after `npm run build`;
- `staging-test`: `node scripts/dev-staging.mjs`, the app against the staging copy of live.

## 10. Run the tests

```bash
npx tsc --noEmit        # type check (the real lint gate; npm run lint is broken, see KNOWN_ISSUES)
npm test                # Vitest unit tests (uses .env.test; 296 tests)
npm run build           # production build
npm run test:e2e        # Playwright, launches `next dev` against .env.test
```

On a low-memory PC (8 GB), run e2e against a production build instead. The dev server can run out of memory:

```bash
npm run build
E2E_SERVER=start npx playwright test          # Git Bash
# PowerShell:  $env:E2E_SERVER="start"; npx.cmd playwright test
```

Nothing else may be using port 3000 (`reuseExistingServer` is false on purpose).

Single spec: `npx playwright test tests/e2e/walkthrough.spec.ts`. That spec opens every page at laptop and phone size and saves screenshots to `test-results/walkthrough/`.

## 11. Verify the app
- http://localhost:3000/api/health returns `{"ok":true,"database":"reachable"}`.
- Sign up, choose a goal, do a Quick Drill, open My Skills, start a mock exam (camera and microphone check), then open the results.
- As an admin, open `/admin`, then the Question Bank coverage grid.

## 12. Deploy (only when the owner says "ship to production")

Follow the runbook in GIT_AND_DEPLOYMENT.md:
1. Take a Neon backup branch.
2. Run migrations if there are any.
3. Run seeds if needed.
4. Fast-forward `main` and push.
5. Watch `vercel ls --prod`.
6. `curl https://vocalisai.vercel.app/api/health`.
7. Check `vercel logs`.
