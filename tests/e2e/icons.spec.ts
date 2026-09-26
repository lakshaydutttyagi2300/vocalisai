import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// One icon style across the candidate interface: every icon on every
// candidate page (desktop and phone width) is from the shared Icon set -
// same stroke weight, one of the standard sizes - and no hand-drawn SVG
// icons remain. Charts (score ring, trend line) are excluded by data-chart.
// Screenshots go to test-results/icons/ for a visual check.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const STANDARD_SIZES = [12, 16, 18, 20, 28];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

async function auditIcons(page: Page, where: string) {
  const icons = await page.evaluate(() =>
    [...document.querySelectorAll("svg")]
      .filter((svg) => !svg.closest("[data-chart]") && !svg.closest("nextjs-portal") && svg.getBoundingClientRect().width > 0)
      .map((svg) => ({
        cls: svg.getAttribute("class") ?? "",
        stroke: svg.getAttribute("stroke-width"),
        // Its own size (not the on-screen box, which grows while a chevron rotates).
        width: Math.round(svg.width.baseVal.value),
        height: Math.round(svg.height.baseVal.value),
      }))
  );
  for (const i of icons) {
    expect(i.cls, `${where}: every icon uses the shared set`).toContain("vx-icon");
    expect(i.stroke, `${where}: same stroke weight`).toBe("1.75");
    expect(STANDARD_SIZES, `${where}: standard size (${i.width}px)`).toContain(i.width);
    expect(i.height, `${where}: square`).toBe(i.width);
  }
  return icons.length;
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/icons/${name}.png`, fullPage: true });
}

test("one consistent icon style on every candidate page, desktop and phone", async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  const email = `e2e-icons-${Date.now()}@example.test`;
  const user = await createTestUser(email, password, "Icon Check");
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  const counts: string[] = [];

  try {
    // Public pages first (landing, sign-in).
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of ["/", "/login"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        counts.push(`${vp.name} ${path}: ${await auditIcons(page, `${vp.name} ${path}`)} icons`);
        await shoot(page, `${vp.name}${path === "/" ? "-landing" : path.replace(/\//g, "-")}`);
      }
    }

    await page.goto("/");
    await loginAs(page, email, password);

    const pages = ["/dashboard", "/practice", "/mock-tests", "/mock-tests/history", "/speech-analysis", "/progress", "/coach", "/billing", "/profile"];
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of pages) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
        counts.push(`${vp.name} ${path}: ${await auditIcons(page, `${vp.name} ${path}`)} icons`);
        await shoot(page, `${vp.name}${path.replace(/\//g, "-")}`);
      }

      // Menus: dropdown (desktop) / menu button (phone).
      await page.goto("/dashboard");
      if (vp.name === "desktop") {
        await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Practice" }).click();
        await auditIcons(page, "desktop practice menu open");
        await page.screenshot({ path: "test-results/icons/desktop-nav-open.png", clip: { x: 0, y: 0, width: 1280, height: 420 } });
        await page.keyboard.press("Escape");
      } else {
        await page.getByRole("button", { name: "Toggle menu" }).click();
        await auditIcons(page, "phone menu open");
        await shoot(page, "phone-menu-open");
      }

      // Mock-test entry flow: intro, system check, rules.
      await page.goto("/mock-tests");
      await page.getByRole("button", { name: "Begin system check" }).click();
      await page.getByRole("button", { name: "Enable camera" }).click();
      await page.getByRole("button", { name: "Enable microphone" }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      const toRules = page.getByRole("button", { name: "Continue to rules" });
      await expect(toRules).toBeEnabled({ timeout: 20_000 });
      counts.push(`${vp.name} system check: ${await auditIcons(page, `${vp.name} system check`)} icons`);
      await shoot(page, `${vp.name}-system-check`);
      await toRules.click();
      await expect(page.getByRole("checkbox")).toBeVisible();
      counts.push(`${vp.name} rules: ${await auditIcons(page, `${vp.name} rules`)} icons`);
      await shoot(page, `${vp.name}-rules`);

      // A listening question (practice) shows the player's icon tile.
      await page.goto("/practice/listening");
      await page.getByRole("button", { name: "Intermediate" }).click();
      await expect(page.getByLabel("Listening recording")).toBeVisible({ timeout: 30_000 });
      counts.push(`${vp.name} listening question: ${await auditIcons(page, `${vp.name} listening`)} icons`);
      await shoot(page, `${vp.name}-listening`);
    }

    expect(errors).toEqual([]);
    console.log(counts.join("\n"));
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
