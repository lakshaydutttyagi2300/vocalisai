// Runs the app locally against the STAGING database (a copy of live, used
// to try new work before it ships). Reads DATABASE_URL from the git-ignored
// .env.staging; everything else comes from .env as usual (Next never
// overrides a variable that is already set).
//
//   node scripts/dev-staging.mjs
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
for (const line of readFileSync(path.join(root, ".env.staging"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
}
if (!env.DATABASE_URL?.includes("ep-wispy-firefly-b4l47um3")) {
  console.error("Refusing to start: .env.staging does not point at the staging database.");
  process.exit(1);
}

const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "dev"], { cwd: root, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
