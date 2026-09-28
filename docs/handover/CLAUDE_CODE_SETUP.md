# Claude Code setup: what transfers to a new Claude account and what doesn't

## Summary

| Item | Where it lives | Transfers automatically? | How to recreate |
|---|---|---|---|
| `CLAUDE.md` (just `@AGENTS.md`) | repo root, committed | **Yes** (it's in git) | nothing to do |
| `AGENTS.md` ("This is NOT the Next.js you know") | repo root, committed | **Yes** | nothing. `next dev` re-writes this block; keep it. |
| `CLAUDE_NEW_ACCOUNT_START.md` and `docs/handover/*` | repo, committed | **Yes** (once pushed) | tell the new Claude to read it first |
| `.claude/launch.json` (3 dev-server entries) | repo, committed | **Yes** | nothing |
| `.claude/skills/neon*` (7 Neon agent skills) and `skills-lock.json` | repo, committed | **Yes** | nothing |
| **Claude's memory notes** (the owner's preferences and runbooks) | `%USERPROFILE%\.claude\projects\C--Users-Lakshaydutt-tyagi-Downloads-New-folder\memory\*.md`, on this PC only | **No** | copied in full below. Paste them into the new session, or ask the new Claude to save them as memory. |
| **Neon MCP server** | `%USERPROFILE%\.claude.json`, user-level `mcpServers.Neon` (HTTP, `https://mcp.neon.tech/mcp`, `Authorization` header with a Neon API key) | **Maybe not.** It's on this PC, not in the account. A new login on the same PC normally keeps it; a new PC doesn't have it. | the command below |
| claude.ai connectors (Neon, Vercel, Figma, and others) | your claude.ai account settings | **No** | reconnect in claude.ai, Settings, Connectors. Optional: the Vercel one never worked for this team (403), so use the Vercel CLI. |
| Claude desktop app built-in tools (Browser pane, preview) | the Claude desktop app | Yes, with the app | install the Claude desktop app and log in |
| Conversation history (these sessions) | `%USERPROFILE%\.claude\projects\...\*.jsonl` | **No** (the new account can't see old chats) | the handover files replace it. The `.jsonl` files stay on this PC if you ever need to search them. |
| Hooks, custom slash commands, subagents | none configured | n/a | none |
| Permissions / allowed tools | none saved for this project (`allowedTools: []`) and no `~/.claude/settings.json` | n/a | none. You'll approve actions as they come up. |
| Output style / model | defaults | n/a | none |

## Recreating the Neon MCP server (lets Claude run SQL and manage Neon branches)

1. Neon dashboard, Account settings, **API keys**, Create key. Copy it: `<NEON_API_KEY>`.
2. In a terminal:

```bash
claude mcp add --transport http --scope user Neon https://mcp.neon.tech/mcp --header "Authorization: Bearer <NEON_API_KEY>"
```

3. Check it with `claude mcp list`. `Neon` should show as connected.

Instead of a key, you can connect "Neon" as a claude.ai connector (OAuth). Choose "All projects" when asked.

**Safety rule used so far:** the Neon MCP must never run destructive SQL, or change or delete production branches, without the owner's explicit OK. Read-only checks on production were also blocked by Claude's auto-mode safety check in the last session; that's expected, so ask the owner.

## Established way of working (follow this)

These are the owner's standing instructions and lessons from past sessions. The memory notes below have the full text.

1. **The owner is non-technical.**
   - End every reply with a plain-language "what I did / what's left".
   - When the owner has to do something, give numbered, copy-paste steps.
2. **Work in phases, and stop after each phase to report.**
   - Push permission covers pushing the *branch*.
   - It is **not** permission to start the next phase, or to deploy.
3. **Production deploys only when the owner types "ship to production".**
   - Pushing `main` = deploying live.
   - Follow the release runbook in GIT_AND_DEPLOYMENT.md, including the database backup, migrations and **post-deploy health and log checks**.
4. **Database changes:**
   - Only through reversible, **additive** Prisma migrations.
   - Show the migration plan before running it.
   - Never run a migration on production without explicit approval.
   - Take a Neon backup branch first.
5. **Secrets stay server-side, in env vars.**
   - Never send a key to the browser.
   - Never commit `.env*`.
   - The repo is public.
6. **Don't break or delete the existing exam system or user data.**
7. **Zero-cost design for now.**
   - No paid services are required.
   - ElevenLabs stays off unless the owner decides otherwise.
8. **Test before live:**
   - Run `npx tsc --noEmit`, `npm test`, `npm run build`, then Playwright.
   - For manual checks, use the local staging copy (`.claude/launch.json` entry `staging-test`), not Vercel previews.
9. **Don't make the owner fight the Vercel UI.**
   - Use the Vercel CLI (`vercel env ls`, `vercel logs`, `vercel ls --prod`).
   - Treat any missing core env var as a blocker and say so immediately.

## Memory notes from the old account (full text, no secrets)

Paste these into the new session and ask Claude to save them, or leave them here for reference.

### Push to GitHub without asking
The owner gave standing permission to push commits to GitHub (`lakshaydutttyagi2300/vocalisai`) right after committing. They work across two laptops (office and personal) and want GitHub always in sync. Rules that still apply:
- never force-push;
- never push secrets (`.env*` stays ignored);
- still stop for approval between roadmap phases.

### Pushing main deploys live
Every push to `main` auto-deploys to https://vocalisai.vercel.app. Vercel's build is `next build` only: it does **not** run `prisma migrate deploy`.

On 24-25 Sep 2026, code with new columns went live before the production database was migrated. Mock tests, practice and admin pages then failed for about a day.

**Rule:** before pushing any commit with a new migration, tell the owner it publishes live. Ask whether to apply the migration to production first, taking a backup branch before that.

### Plain-language summaries
The owner is non-technical and asked: "Always tell in the end what have you done and what needs to be done in a layman language."

### Preview and release flow
- **Why previews don't work:** Vercel's variables are Production-only; Preview has none. Setting them up means copying about 12 secrets, and the owner found the Vercel UI too hard for that.
- **Test with the local staging copy instead:** the `staging-test` launch config (`node scripts/dev-staging.mjs`) runs the app against the Neon **staging** branch.
- **Release runbook:**
  1. Take a Neon backup branch.
  2. Run `prisma migrate status`/`deploy` against production.
  3. Run the seeds with `--production` if needed.
  4. Fast-forward `main` and push.
  5. Poll `vercel ls --prod` until the deploy is Ready.
  6. **Mandatory:** `curl https://vocalisai.vercel.app/api/health` must return `{"ok":true,...}`.
  7. **Mandatory:** check `vercel logs https://vocalisai.vercel.app` for errors.

  Logged-out checks alone are not enough.
- **Incident, 26 Sep 2026:**
  - `DATABASE_URL` disappeared from Vercel Production during the owner's attempt to add a Preview variable.
  - Every signed-in page showed "Internal Server Error" from 17:04 to 19:36 IST.
  - The hotfix was `resolveDatabaseUrl()` in `src/lib/db.ts`: it falls back to `DATABASE_URL_UNPOOLED` on the pooler host.
  - Claude had seen the variable missing and didn't flag it. Lesson: treat any missing core env var as a blocker.

### No spending for now
On 26 Sep 2026 the owner said "I do not want to invest anything at the moment." ElevenLabs is built but off (no key), and the app uses the best on-device voice. Design new features to cost nothing to run. Mention paid options once, as optional, with the price.

### E2E: one test run at a time
- **What happened (28 Sep 2026):** a full browser-test run showed 5 failures. A second test runner from an interrupted earlier session was still running against the same test database and server. The two runs flipped the `exam_runner_v2` flag, swapped the default exam template, and deleted each other's test data.
- **Before any e2e run:**
  - check that no `node.exe` is running (Task Manager, or `Get-Process node` in PowerShell);
  - check that port 3000 is free.
- On this 8 GB PC, run `npm run build`, then `E2E_SERVER=start npx playwright test`.

## Starting the new session

1. Open the project folder in Claude Code (desktop app, Code tab, or `claude` in a terminal in the repo folder).
2. First message: **"Read CLAUDE_NEW_ACCOUNT_START.md and docs/handover/README.md, then tell me the current state before changing anything."**
