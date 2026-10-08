import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The International Process readiness page through the real server: a new
// candidate is invited to take the assessment; a candidate with a marked
// assessment sees their % and the areas to work on, on a laptop and a phone.
const password = "correct-horse-battery-staple";
const stamp = Date.now();
let realLoaded = false;
let familyCreated = false;
let familyId = "";
let variantId = "";
let templateId = "";

const components = [
  { key: "listening", label: "Listening", points: 20, max: 25, pending: false },
  { key: "speaking", label: "Speaking", points: 14, max: 20, pending: false },
  { key: "pronunciation", label: "Pronunciation", points: 12, max: 15, pending: false },
  { key: "fluency", label: "Fluency", points: 9, max: 15, pending: false },
  { key: "grammarVocabulary", label: "Grammar & vocabulary", points: 9, max: 10, pending: false },
  { key: "customerHandling", label: "Customer handling", points: 12, max: 15, pending: false },
];

test.beforeAll(async () => {
  realLoaded = !!(await db.examVariant.findFirst({ where: { slug: "CUSTOMER_SUPPORT_BPO" } }));
  if (realLoaded) return;
  let family = await db.examFamily.findUnique({ where: { slug: "CUSTOMER_SERVICE_ENGLISH" } });
  if (!family) {
    family = await db.examFamily.create({ data: { slug: "CUSTOMER_SERVICE_ENGLISH", name: "Customer Service English" } });
    familyCreated = true;
  }
  familyId = family.id;
  variantId = (await db.examVariant.create({ data: { familyId, slug: "CUSTOMER_SUPPORT_BPO", name: `E2E readiness ${stamp}`, scoreScale: "PASS_MERIT_DISTINCTION" } })).id;
  templateId = (await db.mockTestTemplate.create({ data: { name: `E2E readiness ${stamp}`, examVariantId: variantId } })).id;
});

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-readiness-${stamp}` } } });
  if (templateId) await db.mockTestTemplate.deleteMany({ where: { id: templateId } });
  if (variantId) await db.examVariant.deleteMany({ where: { id: variantId } });
  if (familyCreated) await db.examFamily.deleteMany({ where: { id: familyId } });
});

test("a new candidate is invited to take the assessment", async ({ page }) => {
  test.skip(realLoaded, "The real assessment is loaded in this database; this test needs its own copy.");
  test.setTimeout(120_000);
  const email = `e2e-readiness-${stamp}-new@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.goto("/readiness");
  await expect(page.getByRole("heading", { name: "Let's find your starting point" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Take the Customer Support English Assessment/ })).toHaveAttribute("href", `/mock-tests?template=${templateId}`);
  await expect(page.getByText(/not an official Versant, SVAR or employer score/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phone: no sideways scrolling").toBe(true);
});

test("a candidate with a marked assessment sees their % on a laptop and a phone", async ({ page }, testInfo) => {
  test.skip(realLoaded, "The real assessment is loaded in this database; this test needs its own copy.");
  test.setTimeout(120_000);
  const email = `e2e-readiness-${stamp}-done@example.test`;
  const u = await createTestUser(email, password, "Priya Nair");
  const s = await db.mockTestSession.create({ data: { userId: u.id, templateId, endedAt: new Date() } });
  await db.scoreReport.create({
    data: {
      mockTestSessionId: s.id,
      overallScore: 76,
      categoryScoresJson: JSON.stringify({ supportAssessment: { status: "done", speech: {}, ratings: {}, result: { overall: 76, components, strengths: [], weaknesses: [], priorities: [] }, costUsd: 0 } }),
    },
  });

  await page.goto("/");
  await loginAs(page, email, password);
  await page.emulateMedia({ reducedMotion: "reduce" }); // still screenshots: no count-up or fade-in
  for (const [name, size] of [["laptop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(size);
    await page.goto("/readiness");
    await expect(page.getByRole("heading", { name: "You are 76% International Process Ready" })).toBeVisible();
    await expect(page.getByText("76", { exact: true }).first()).toBeVisible(); // the score ring
    await expect(page.getByText("Fluency", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no sideways scrolling`).toBe(true);
    await expect(page.getByRole("heading", { name: "Your readiness score" })).toBeVisible();
    await page.waitForFunction(() => [...document.querySelectorAll(".cine-copy > *")].every((el) => getComputedStyle(el).opacity === "1")); // the hero text has risen in
    const shot = testInfo.outputPath(`readiness-${name}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    await testInfo.attach(`readiness-${name}`, { path: shot, contentType: "image/png" });
  }
});
