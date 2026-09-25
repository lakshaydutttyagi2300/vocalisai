// Shared e2e helpers. Deliberately NOT reusing the real /signup form for
// every test's account creation - it's real, IP-rate-limited (5/hour, see
// api/auth/signup/route.ts), so a full suite that goes through it for
// every test would trip the same limiter a real burst of signups would,
// and fail for a reason that has nothing to do with what each test
// actually checks. auth.spec.ts still exercises the real signup form
// directly (that's its whole point) - everything else creates the account
// straight in the DB and authenticates through NextAuth's own credentials
// callback, the same CSRF-token flow the browser itself uses.
import type { APIRequestContext, Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function createTestUser(email: string, password: string, name = "E2E Candidate") {
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.create({ data: { email, passwordHash, name } });
}

// Verifies a session actually exists afterwards (GET /api/auth/session)
// rather than trusting the callback's 200 - on a freshly started dev
// server the very first credentials callback can return 200 without the
// session cookie sticking. One retry covers that; a second failure throws
// loudly so a real auth problem is never masked.
//
// It also clears the TEST branch's login rate-limit rows first. The real
// limit (20 logins / 10 min per IP, src/lib/auth.ts) is correct and
// untouched - but every Playwright request shares one "unknown" IP
// bucket, and the suite now logs in more than 20 times in one run, so the
// one-time clear in global-setup.ts is no longer enough on its own.
export async function loginAs(page: Page, email: string, password: string) {
  const request: APIRequestContext = page.request;
  await db.rateLimitHit.deleteMany({ where: { key: { startsWith: "login:" } } });
  for (let attempt = 1; attempt <= 2; attempt++) {
    const csrfRes = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    const res = await request.post("/api/auth/callback/credentials", {
      form: { csrfToken, email, password, json: "true" },
    });
    if (!res.ok()) {
      throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
    }

    const session = await (await request.get("/api/auth/session")).json().catch(() => null);
    if (session?.user?.email === email) return;
  }
  throw new Error(`Login for ${email} returned OK but no session was established.`);
}
