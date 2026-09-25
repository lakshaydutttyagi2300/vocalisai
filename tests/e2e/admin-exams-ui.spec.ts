import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// P1-G screens in a real browser: an admin builds an exam format on
// /admin/exams, links it to a template on /admin/templates, and creates a
// reading-passage group on /admin/item-groups - all by clicking, then the
// database is checked and everything created here is removed.
const password = "correct-horse-battery-staple";

test("an admin builds a format, links a template to it, and creates a passage group - through the UI", async ({ page }) => {
  test.setTimeout(300_000);
  page.on("dialog", (d) => d.accept());

  const email = `e2e-admin-ui-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await page.goto("/");
  await loginAs(page, email, password);

  const templateName = `UI linked ${Date.now()}`;
  const groupTitle = `UI passage ${Date.now()}`;
  let familyId: string | null = null;

  try {
    // --- Exams page -------------------------------------------------------
    await page.goto("/admin/exams");
    await expect(page.getByRole("heading", { name: "Exam catalogue" })).toBeVisible();
    const familyPicker = page.getByLabel("Exam family to add");
    await expect(familyPicker).toBeVisible({ timeout: 30_000 }); // catalogue loads after the heading
    const firstOption = familyPicker.locator("option").nth(1);
    test.skip((await firstOption.count()) === 0, "every registry family already exists in this database");
    const familyName = (await firstOption.textContent())!.trim();
    await familyPicker.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add family" }).click();

    const familyCard = page.getByRole("region", { name: `Exam family ${familyName}` });
    await expect(familyCard).toBeVisible({ timeout: 20_000 });
    familyId = (await db.examFamily.findFirstOrThrow({ where: { name: familyName } })).id;

    await familyCard.getByPlaceholder("Name (e.g. Academic)").fill("UI Version");
    await familyCard.getByPlaceholder("Short code (e.g. ACADEMIC)").fill("UIV");
    await familyCard.getByRole("button", { name: "Add version" }).click();
    // Wait for the SAVED row (its own aria-label), not the add-form input,
    // which still shows the typed text until the save completes.
    await expect(familyCard.locator('[aria-label="Version UI Version"]')).toBeVisible({ timeout: 20_000 });

    await familyCard.getByPlaceholder("Name (e.g. Listening)").fill("UI Listening");
    await familyCard.getByLabel("Paper minutes").first().fill("25");
    await familyCard.getByRole("button", { name: "Add paper" }).click();
    await expect(familyCard.locator('[aria-label="Paper UI Listening"]')).toBeVisible({ timeout: 20_000 });

    await familyCard.getByPlaceholder("New part name (e.g. Part 1)").fill("UI Part 1");
    await familyCard.getByRole("button", { name: "Add part" }).click();
    await expect(familyCard.locator('[aria-label="Part UI Part 1"]')).toBeVisible({ timeout: 20_000 });

    const paper = await db.examPaper.findFirstOrThrow({ where: { name: "UI Listening", variant: { familyId } }, include: { parts: true } });
    expect(paper.durationSeconds).toBe(25 * 60);
    expect(paper.parts.map((p) => p.name)).toEqual(["UI Part 1"]);

    // --- Template editor --------------------------------------------------
    await page.goto("/admin/templates");
    await page.getByRole("button", { name: "New template" }).click();
    const dialog = page.getByRole("dialog", { name: "New template" });
    await dialog.getByRole("textbox").first().fill(templateName);
    await dialog.getByLabel("Exam format (optional)").selectOption({ label: `${familyName} · UI Version` });
    await dialog.getByLabel("Section 1 exam part").selectOption({ label: "UI Listening › UI Part 1" });
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(templateName)).toBeVisible();

    const template = await db.mockTestTemplate.findFirstOrThrow({ where: { name: templateName }, include: { sections: true } });
    expect(template.examVariantId).not.toBeNull();
    expect(template.sections[0].examPartId).toBe(paper.parts[0].id);

    // --- Item groups ------------------------------------------------------
    await page.goto("/admin/item-groups");
    await page.getByRole("button", { name: "New group" }).click();
    await page.getByLabel("Title").fill(groupTitle);
    await page.getByLabel("Passage text (required)").fill("Trains leave every twenty minutes.");
    await page.getByRole("button", { name: "Save group" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Edit group" })).toBeVisible();

    const group = await db.itemGroup.findFirstOrThrow({ where: { title: groupTitle } });
    expect(group).toMatchObject({ type: "PASSAGE", text: "Trains leave every twenty minutes." });
  } finally {
    await db.mockTestTemplate.deleteMany({ where: { name: templateName } });
    await db.itemGroup.deleteMany({ where: { title: groupTitle } });
    if (familyId) await db.examFamily.deleteMany({ where: { id: familyId } });
  }
});
