// Dev helper: full-page screenshots of pages at desktop and phone widths.
//   node scripts/ui-snap.mjs / /dashboard      (needs a server on :3000)
// Pages behind login use SNAP_EMAIL / SNAP_PASSWORD if set. Output: ui-snaps/
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.SNAP_BASE ?? "http://localhost:3000";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
mkdirSync("ui-snaps", { recursive: true });

const browser = await chromium.launch();
for (const [name, viewport] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  if (process.env.SNAP_EMAIL) {
    const csrf = await (await page.request.get(`${base}/api/auth/csrf`)).json();
    await page.request.post(`${base}/api/auth/callback/credentials`, {
      form: { csrfToken: csrf.csrfToken, email: process.env.SNAP_EMAIL, password: process.env.SNAP_PASSWORD ?? "", json: "true" },
    });
  }
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const file = `ui-snaps/${name}${p === "/" ? "_home" : p.replace(/[/?=&]/g, "_")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }
  await context.close();
}
await browser.close();
