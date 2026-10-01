import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import path from "node:path";
import { patientDatabaseUrl } from "./tests/patient-db-url";

// Layer .env (real dev secrets: GROQ/GEMINI/R2 keys, so the app boots the
// same as `npm run dev` would) then .env.test on top of it (DATABASE_URL +
// NEXTAUTH_SECRET pointed at the disposable test branch) - the dev server
// this config launches gets AI/storage providers configured normally but
// talks to the test database only. Neither `next dev` nor Playwright loads
// .env.test on its own, so this file is the one place that does.
config({ path: path.resolve(__dirname, ".env") });
config({ path: path.resolve(__dirname, ".env.test"), override: true });
process.env.DATABASE_URL = patientDatabaseUrl(process.env.DATABASE_URL);
// Browser tests never send real email (sign-up codes, password resets):
// the app only writes them to the server log (src/lib/email.ts).
process.env.EMAIL_DELIVERY = "log";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false, // shared test database - sequential avoids cross-test races
  workers: 1, // one shared test database/dev server - separate spec files must not run concurrently either
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    // E2E_SERVER=start runs against a production build (`npm run build` first) -
    // far lighter on memory than the dev server compiling every page.
    command: process.env.E2E_SERVER === "start" ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    // Always false, even locally: an already-running dev server on :3000
    // (e.g. a manual preview) would otherwise be reused as-is, silently
    // pointed at whatever database IT was started with - never the test
    // branch this config just injected. A fresh launch guarantees this
    // env (test DB) is the one actually running.
    reuseExistingServer: false,
    timeout: 120_000,
    env: process.env as Record<string, string>,
  },
});
