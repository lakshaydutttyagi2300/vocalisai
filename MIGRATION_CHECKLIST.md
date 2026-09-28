# Migration checklist: moving to a new Claude account

Tick each box as you go. Details are in `docs/handover/`. Placeholders like `<NEON_API_KEY>` mean "copy the value from that service's dashboard". Never paste real keys into any file that goes to GitHub: **the repository is public.**

## A. Before the old Claude account expires (today)

- [ ] **Code is on GitHub.** In the project folder:
  ```bash
  git status
  git log --oneline -3
  git status -sb
  ```
  - `git log` should show the Phase 5 / handover commit on top.
  - `git status -sb` must say `## feat/skills-platform...origin/feat/skills-platform` with **no** `[ahead N]`.
  - If files are listed as modified, see `docs/handover/GIT_AND_DEPLOYMENT.md`, section "Commands to commit and push".
- [ ] **No secrets were committed.** `git ls-files | grep -E "^\.env"` must list only `.env.example` and `.env.test.example`.
- [ ] Optional: keep the old design concept on GitHub with `git push origin design/premium-dashboard-concept`.
- [ ] **Back up your private settings files.** Copy these files from the project folder to a safe private place (a password manager, or an encrypted USB drive; **not** GitHub, email or chat):
  - `.env` (development keys and database)
  - `.env.test` (test database)
  - `.env.staging` (staging database)
- [ ] **Note where each secret lives** (`docs/handover/SERVICES_AND_SECRETS.md`): Neon, Vercel, Cloudflare R2, Groq, Google Gemini, Resend, and Paddle (partly set up).
- [ ] **Neon MCP key:** if you don't have the Neon API key used by Claude, you'll create a new one tomorrow (Neon, Account settings, API keys). The old one is in `C:\Users\<you>\.claude.json`; don't copy that file anywhere public.
- [ ] Optional: export this conversation for your own records. The handover files already contain everything needed.
- [ ] **Check the live site is healthy:** open https://vocalisai.vercel.app/api/health. It should show `"ok":true`.

## B. New account setup (tomorrow)

- [ ] Create the new Claude account, then install and log in to the **Claude desktop app** (Code tab) or Claude Code (`npm i -g @anthropic-ai/claude-code`, then `claude`).
- [ ] **Same computer?** The project folder `C:\Users\Lakshaydutt.tyagi\Downloads\New folder` and your `.env` files stay where they are. Skip the clone; run `git pull` instead.
- [ ] **New computer?** Clone it:
  ```bash
  git clone https://github.com/lakshaydutttyagi2300/vocalisai.git
  cd vocalisai
  git checkout feat/skills-platform
  ```
- [ ] Install Node.js 24 and Git (new computer only).
- [ ] `npm install`, then `npx playwright install chromium`.
- [ ] **Restore the private settings files:** put `.env`, `.env.test` and `.env.staging` back in the project folder. If they're lost, rebuild them from `.env.example`, `.env.test.example` and SERVICES_AND_SECRETS.md.
- [ ] **Log in to the helper tools** (these are per computer):
  - `gh auth login` (GitHub);
  - `npm i -g vercel`, then `vercel login`, then `vercel link` (team **vocalis-ai**, project **vocalisai**).
- [ ] **Reconnect Neon for Claude:**
  ```bash
  claude mcp add --transport http --scope user Neon https://mcp.neon.tech/mcp --header "Authorization: Bearer <NEON_API_KEY>"
  claude mcp list
  ```
- [ ] Optional: reconnect the claude.ai connectors (Settings, Connectors: Neon, Vercel, Figma). Not needed to run the app.
- [ ] **Give Claude its memory.** First message in the new session:
  > "Read CLAUDE_NEW_ACCOUNT_START.md, then docs/handover/CLAUDE_CODE_SETUP.md, and save the 'Memory notes from the old account' and the 'Established way of working' as your memory for this project. Then tell me the current state before changing anything."

## C. Check everything works

- [ ] `npm run dev`, then open http://localhost:3000 and log in.
- [ ] http://localhost:3000/api/health shows `"ok":true`.
- [ ] Ask Claude to run the full test gate:
  1. `npx tsc --noEmit`
  2. `npm test`
  3. `npm run build`
  4. `E2E_SERVER=start npx playwright test`

  Compare with `CURRENT_STATE.md`.
- [ ] The live site still works: https://vocalisai.vercel.app (log in, open the dashboard).

## D. Continue the work

- [ ] Follow `NEXT_STEPS.md`, starting with "Immediate".
- [ ] When you're happy with the Phase 5 fixes, tell Claude **"ship to production"**. Nothing goes live before that.
- [ ] Soon (High priority 5): re-add `DATABASE_URL` in Vercel Production. Claude can guide you step by step.

## Things that are safe and need no action
- Your **Neon, Vercel, GitHub, Cloudflare, Groq, Google, Resend and Paddle** accounts belong to you, not to Claude, so they keep working.
- The **live website** keeps running on its own.
- **No database or user data** is stored in your Claude account.
