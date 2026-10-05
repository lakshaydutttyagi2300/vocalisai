import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// No photo or clip appears twice: not on two pages, and not twice on one page
// (at desktop or phone width). Every picture a page shows is tagged with its
// library scene (data-scene on clips and photos, data-media on page heroes);
// see src/config/mediaLibrary.ts and tests/unit/media-library.test.ts.

const PUBLIC = [
  "/",
  "/product/speaking",
  "/product/interviews",
  "/product/personalised",
  "/use-cases",
  "/pricing",
  "/about",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
  "/explore",
  "/explore/skills",
  "/explore/skills/reasoning",
  "/explore/company-hiring-assessments",
  "/explore/company-hiring-assessments/tcs-nqt",
  "/explore/aptitude-reasoning",
  "/explore/english-communication",
  "/explore/workplace-assessments",
  "/explore/career-entrance",
  "/explore/professional-certification",
];
const SIGNED_IN = [
  "/dashboard",
  "/practice",
  "/practice/quick",
  "/practice/conversation",
  "/practice/grammar",
  "/mock-tests",
  "/mock-tests/history",
  "/speech-analysis",
  "/progress",
  "/performance",
  "/coach",
  "/goal",
  "/goal/choose",
  "/skills",
  "/bookmarks",
  "/practice-tests",
  "/profile",
  "/billing",
];
const WIDTHS = [
  [1280, 900],
  [390, 844],
] as const;

async function scenesOn(page: Page) {
  return page.evaluate(() => {
    const tagged = [
      ...[...document.querySelectorAll("[data-scene]")].map((e) => e.getAttribute("data-scene")!),
      ...[...document.querySelectorAll("[data-media]")].flatMap((e) => e.getAttribute("data-media")!.split(" ")),
    ];
    // Every library file the page loads must belong to a tagged scene.
    const urls = [
      ...[...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src),
      ...[...document.querySelectorAll("source")].map((s) => s.getAttribute("srcset") || s.getAttribute("src") || ""),
      ...[...document.querySelectorAll("video")].map((v) => v.getAttribute("poster") || ""),
    ];
    const loaded = [...new Set(urls.flatMap((u) => [...u.matchAll(/\/media\/(?:cine|stills)\/([a-z0-9-]+?)(?:-1280|-640|-800)?\.(?:webp|jpg|mp4|webm)/g)].map((m) => m[1])))];
    return { tagged, loaded };
  });
}

test("no photo or clip is used twice anywhere on the site, at desktop or phone width", async ({ page }) => {
  test.setTimeout(900_000);
  const password = "correct-horse-battery-staple";
  const email = `e2e-media-${Date.now()}@example.test`;
  const user = await createTestUser(email, password, "Asha Candidate");
  const where = new Map<string, Set<string>>();
  const problems: string[] = [];

  async function check(path: string, width: number) {
    const res = await page.goto(path, { waitUntil: "load" });
    expect(res?.status(), path).toBeLessThan(400);
    await page.waitForTimeout(400);
    const { tagged, loaded } = await scenesOn(page);
    const dupes = tagged.filter((s, i) => tagged.indexOf(s) !== i);
    if (dupes.length) problems.push(`${path} @${width}: shows ${[...new Set(dupes)].join(", ")} twice`);
    const untagged = loaded.filter((s) => !tagged.includes(s));
    if (untagged.length) problems.push(`${path} @${width}: loads ${untagged.join(", ")} without a library tag`);
    for (const s of tagged) where.set(s, (where.get(s) ?? new Set()).add(new URL(page.url()).pathname));
  }

  try {
    // Public pages signed out (sign-in pages redirect a signed-in visitor), then the app.
    for (const [width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      for (const path of PUBLIC) await check(path, width);
    }
    await page.goto("/");
    await loginAs(page, email, password);
    await page.request.post("/api/goal", { data: { slug: "BPO_SUPPORT" } });
    for (const [width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      for (const path of SIGNED_IN) await check(path, width);
    }

    for (const [s, pages] of where) if (pages.size > 1) problems.push(`${s} appears on ${[...pages].join(", ")}`);
    expect(where.size, "scenes seen across the site").toBeGreaterThan(80);
    expect(problems).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
