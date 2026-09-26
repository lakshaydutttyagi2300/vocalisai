import { test, expect, type Page, type Locator } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// The candidate button system in a real browser: the key actions use the
// shared variants (primary / secondary / danger / ghost / dark), share one
// height per size, and have real hover, focus, disabled and loading states.
// Screenshots (desktop + phone) go to test-results/buttons/.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const VARIANTS = ["btn-primary", "btn-secondary", "btn-danger", "btn-ghost", "btn-dark"];

async function variantOf(btn: Locator) {
  const cls = (await btn.getAttribute("class")) ?? "";
  return VARIANTS.find((v) => cls.split(/\s+/).includes(v)) ?? "none";
}

async function heightOf(btn: Locator) {
  return Math.round((await btn.boundingBox())!.height);
}

async function expectButton(btn: Locator, variant: string, size: "sm" | "md" | "lg" = "md") {
  await expect(btn).toBeVisible();
  expect(await variantOf(btn), await btn.innerText()).toBe(variant);
  const h = await heightOf(btn);
  const expected = { sm: 36, md: 44, lg: 48 }[size];
  expect(h, `${await btn.innerText()} height`).toBeGreaterThanOrEqual(expected);
  expect(h, `${await btn.innerText()} height`).toBeLessThanOrEqual(expected + 22); // may wrap on phones
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/buttons/${name}.png`, fullPage: true });
}

test("key candidate actions use the premium button system, with every state, on desktop and phone", async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  const email = `e2e-buttons-${Date.now()}@example.test`;
  const user = await createTestUser(email, password, "Button Check");
  await setPlan(user.id, "STARTER", { periodDays: 30 });

  try {
    // Sign-in page (public).
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/login");
    await expectButton(page.getByRole("button", { name: /log in|sign in/i }).first(), "btn-primary", "lg");
    await shoot(page, "desktop-login");

    await page.goto("/");
    await loginAs(page, email, password);

    for (const vp of [
      { name: "desktop", width: 1280, height: 900 },
      { name: "phone", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Start Practice: difficulty buttons + Back.
      await page.goto("/practice/grammar");
      await expectButton(page.getByRole("link", { name: "Back to Practice" }), "btn-ghost", "sm");
      await expectButton(page.getByRole("button", { name: "Beginner" }), "btn-secondary", "lg");
      await shoot(page, `${vp.name}-practice-start`);

      // Practice question: Submit is disabled until answered, then Next.
      await page.getByRole("button", { name: "Beginner" }).click();
      const submit = page.getByRole("button", { name: "Submit" });
      await expect(submit).toBeVisible({ timeout: 30_000 });
      await expect(submit).toBeDisabled();
      expect(Number(await submit.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.6); // disabled look
      await page.locator(".card button").first().click();
      await expect(submit).toBeEnabled();
      await expectButton(submit, "btn-primary");
      await shoot(page, `${vp.name}-practice-question`);
      await submit.click();
      await expectButton(page.getByRole("button", { name: /Next question|Finish/ }), "btn-primary");

      // Start Exam flow.
      await page.goto("/mock-tests");
      const begin = page.getByRole("button", { name: "Begin system check" });
      await expectButton(begin, "btn-primary", "lg");
      await shoot(page, `${vp.name}-mock-intro`);
      await begin.click();
      await expectButton(page.getByRole("button", { name: "Enable camera" }), "btn-secondary", "sm");
      await page.getByRole("button", { name: "Enable camera" }).click();
      await page.getByRole("button", { name: "Enable microphone" }).click();
      const cont = page.getByRole("button", { name: "Continue", exact: true });
      await expectButton(cont, "btn-primary", "lg");
      await cont.click();
      const toRules = page.getByRole("button", { name: "Continue to rules" });
      await expect(toRules).toBeEnabled({ timeout: 20_000 });
      await shoot(page, `${vp.name}-system-check`);
      await toRules.click();
      const startTest = page.getByRole("button", { name: "Start test" });
      await expect(startTest).toBeDisabled(); // until the rules are accepted
      await page.getByRole("checkbox").check();
      await expectButton(startTest, "btn-primary", "lg");
      await shoot(page, `${vp.name}-rules`);
      await startTest.click();

      // Proctored exam: End assessment (danger), Start section, question actions.
      await expectButton(page.getByRole("button", { name: "End assessment" }), "btn-danger", "sm");
      const startSection = page.getByRole("button", { name: "Start section" });
      // The section intro loads from the server; late in a full run the dev server can take >5s.
      await expect(startSection).toBeVisible({ timeout: 30_000 });
      await expectButton(startSection, "btn-primary", "lg");
      await shoot(page, `${vp.name}-section-intro`);
      await startSection.click();
      const card = page.locator("div.rounded-lg.bg-white").first();
      await expect(card.getByRole("heading", { level: 3 })).toBeVisible({ timeout: 30_000 });
      const play = card.getByRole("button", { name: "Play audio" });
      if (await play.count()) await expectButton(play, "btn-primary");
      const next = card.getByRole("button", { name: /Submit & (next|finish)/ });
      const record = card.getByRole("button", { name: "Start recording" });
      if (await next.count()) {
        await expect(next).toBeDisabled();
        await card.locator("div.space-y-2 button").first().click();
        await expectButton(next, "btn-primary");
      } else {
        await expectButton(record, "btn-primary");
      }
      await shoot(page, `${vp.name}-exam-question`);
      // Scrolled down, End assessment stays on screen and nothing covers it.
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(300);
      const end = page.getByRole("button", { name: "End assessment" });
      const box = (await end.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeLessThan(vp.height);
      const onTop = await end.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      });
      expect(onTop, "End assessment is not covered by the site menu").toBe(true);
      await page.screenshot({ path: `test-results/buttons/${vp.name}-exam-scrolled.png` });
      await page.mouse.wheel(0, -2000);
      if (await record.count()) {
        await record.click();
        await expectButton(card.getByRole("button", { name: /Stop & (next|finish)/ }), "btn-danger");
        await shoot(page, `${vp.name}-exam-recording`);
      }
      await page.getByRole("button", { name: "End assessment" }).click();
      await expect(page).toHaveURL(/results/, { timeout: 60_000 });
    }

    // States, measured on a real primary button.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/mock-tests");
    const btn = page.getByRole("button", { name: "Begin system check" });
    const before = await btn.evaluate((el) => getComputedStyle(el).backgroundImage);
    await btn.hover();
    await expect.poll(() => btn.evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe(before); // hover
    await page.keyboard.press("Tab"); // move focus into the page, then onto the button
    await btn.focus();
    const outline = await btn.evaluate((el) => (el.matches(":focus-visible") ? getComputedStyle(el).outlineStyle : "no-focus-visible"));
    expect(["solid", "no-focus-visible"]).toContain(outline);
    await btn.evaluate((el) => el.setAttribute("data-loading", "true"));
    const spinner = await btn.evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      return { content: s.content, animation: s.animationName, pointer: getComputedStyle(el).pointerEvents };
    });
    expect(spinner).toEqual({ content: '""', animation: "btn-spin", pointer: "none" }); // loading
    await btn.evaluate((el) => el.removeAttribute("data-loading"));
    await page.keyboard.press("Tab");

    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
