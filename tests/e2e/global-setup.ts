// Runs once before the whole e2e suite. Clears signup/login RateLimitHit
// rows on the test branch only - real, working rate limiting (5 signups/hr
// per IP, 20 logins/10min per IP) that a full suite re-run would otherwise
// trip on its own, since Playwright's request context sends no
// X-Forwarded-For and auth.ts's requestIp() falls back to "unknown" for
// every request, so every test run shares one IP bucket. Never touches
// dev/production - .env.test's DATABASE_URL is the only thing loaded here.
import { config } from "dotenv";
import path from "node:path";

export default async function globalSetup() {
  config({ path: path.resolve(__dirname, "../../.env.test"), override: true });
  const { db } = await import("../../src/lib/db");
  await db.rateLimitHit.deleteMany({ where: { OR: [{ key: { startsWith: "signup:" } }, { key: { startsWith: "login:" } }] } });
  await db.$disconnect();
}
