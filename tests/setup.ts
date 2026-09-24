// Loaded before every Vitest file. Points the app's db client (src/lib/db.ts,
// a plain PrismaClient) at the disposable Neon test branch in .env.test -
// never .env/.env.local, so running `npm test` can never touch development
// or production data even if a developer's shell already has DATABASE_URL
// exported from somewhere else.
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.test"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.test.example to .env.test and point it at a disposable Neon test branch before running tests."
  );
}
