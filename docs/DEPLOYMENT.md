# Git, branches and deployment

## Repository and branches

- **Repository:** https://github.com/lakshaydutttyagi2300/vocalisai. It is **public**, so never commit secrets.
- **`main`** is the live site. **Every push to `main` deploys to production** (Vercel, https://vocalisai.vercel.app).
- **`feat/skills-platform`** is the working branch. Commit and push it freely; each push also builds a Vercel **Preview** deployment (protected by Vercel login; its database is the Neon **staging** branch).
- `design/premium-dashboard-concept` is an old visual concept that was never merged. Nothing depends on it.
- There is no CI (no `.github/workflows`), and no repository secrets. Secrets live in Vercel and in local `.env*` files.

## Rules

1. Finished work is released without asking the owner (their instruction, 1 Oct 2026), but **only** after the full gate below passes, and always through this runbook.
2. Database changes are additive migrations, applied to production **before** the code that needs them (the Vercel build does not migrate).
3. Take a Neon backup branch before any production database change.
4. After every deploy, check `/api/health` and `vercel logs`. Checks made while logged out are not enough.

## Release runbook

1. **Gate** on the branch: `npx tsc --noEmit`, `npm test`, `npm run build`, then `E2E_SERVER=start npx playwright test` (no other test run or server on port 3000).
2. **Backup:** in Neon, create a branch from `production` named `backup-production-before-<what>` (Neon MCP `create_branch`, or the dashboard). The free plan allows 10 branches in total; delete an old backup first if needed, with the owner's OK.
3. **Migrations** (only if `prisma/migrations` changed since the last release), with the production **direct** connection string:
   ```bash
   DATABASE_URL="<PROD_DIRECT_URL>" npx prisma migrate status
   DATABASE_URL="<PROD_DIRECT_URL>" npx prisma migrate deploy
   ```
   PowerShell: `$env:DATABASE_URL = "<PROD_DIRECT_URL>"`, then `npx.cmd prisma migrate deploy`.
4. **Seeds** (only if content changed), each with `DATABASE_URL` pointed at production for that command:
   ```bash
   npm run seed:exam-library -- --production
   npm run seed:skills -- --production
   npm run seed:skills-content -- --production
   npm run seed:catalogue -- --production
   ```
   Run `seed:exam-library` before `seed:skills`: the goal-track exam blueprints look up exams by name.
5. **Deploy:**
   ```bash
   git checkout main
   git merge --ff-only feat/skills-platform
   git push origin main
   git checkout feat/skills-platform
   ```
6. **Watch** `vercel ls --prod` until the newest deployment is **Ready**.
7. **Check:**
   ```bash
   curl https://vocalisai.vercel.app/api/health     # {"ok":true,"database":"reachable"}
   vercel logs https://vocalisai.vercel.app          # no errors
   ```
   Then sign in and open a few pages, including the feature you shipped.
8. **Rollback if broken:** `vercel rollback` (or promote the previous deployment in the Vercel dashboard). For data, restore from the backup branch in Neon.

## Vercel configuration

- **Project:** team `vocalis-ai`, project `vocalisai`; framework Next.js (`vercel.json`); build `next build`.
- **`.vercelignore`** excludes `.next`, `node_modules`, `uploads`, `.env`, `.env.local` and local database files.
- **Environment variables:** **Production** has the full set (see [SERVICES_AND_SECRETS.md](SERVICES_AND_SECRETS.md)); **Preview** has the same set with `DATABASE_URL` / `DATABASE_URL_UNPOOLED` pointing at the Neon **staging** branch. The Paddle variables are still missing from both, so checkout isn't live.
- Check with the Vercel CLI: `vercel env ls production`, `vercel env ls preview`.
- To test a Preview deployment's API, which sits behind Vercel login: `vercel curl https://<deployment-url>/api/health`.

## Past incidents (why the rules exist)

- **24-25 Sep 2026:** code that needed new columns went live before production was migrated; mock tests, practice and admin pages failed for about a day. → Migrate first.
- **26 Sep 2026:** `DATABASE_URL` disappeared from Vercel Production; every signed-in page failed for about 2.5 hours and logged-out checks didn't show it. → `resolveDatabaseUrl()` fallback in `src/lib/db.ts`, the public `/api/health`, and mandatory post-deploy checks.
- **28 Sep 2026:** two browser-test runs overlapped on the shared test database and corrupted each other's results. → One test run at a time.
