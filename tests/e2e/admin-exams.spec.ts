import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { EXAM_FAMILY_SEED } from "@/lib/exam-catalogue";
import { createTestUser, loginAs } from "./helpers";

// P1-G against the real server: admin-only access, the catalogue ->
// template link -> refused delete -> unlink -> delete cycle, Activity Log
// entries, item groups + bulk import with a group, and the guard that keeps
// newer question types out of today's practice screens.
const password = "correct-horse-battery-staple";

async function admin(page: Page, tag: string) {
  const email = `e2e-admin-${tag}-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await page.goto("/");
  await loginAs(page, email, password);
  return user;
}

test("a candidate can't use any of the new admin routes", async ({ page }) => {
  const email = `e2e-admin-cand-${Date.now()}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);

  expect((await page.request.get("/api/admin/exam-catalogue")).status()).toBe(403);
  expect((await page.request.post("/api/admin/exam-catalogue/families", { data: { slug: "IELTS_STYLE" } })).status()).toBe(403);
  expect((await page.request.get("/api/admin/item-groups")).status()).toBe(403);
  expect((await page.request.post("/api/admin/item-groups", { data: { type: "PASSAGE", text: "x" } })).status()).toBe(403);
});

test("catalogue: create a full format, link a template, deletes refused while linked, everything audit-logged", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await admin(page, "catalogue");

  const tree = await (await page.request.get("/api/admin/exam-catalogue")).json();
  expect(tree.scoreScales).toContain("IELTS_STYLE_BAND");
  // Use whichever registry family isn't in the test DB yet.
  const slug = tree.availableFamilies[0]?.slug as string | undefined;
  test.skip(!slug, "every registry family already exists in this database");
  expect(EXAM_FAMILY_SEED.map((f) => f.slug)).toContain(slug);

  // Unknown family slugs are refused - families come only from the registry.
  expect((await page.request.post("/api/admin/exam-catalogue/families", { data: { slug: "MADE_UP" } })).status()).toBe(400);

  const family = await (await page.request.post("/api/admin/exam-catalogue/families", { data: { slug } })).json();
  let templateId: string | null = null;
  try {
    expect((await page.request.post("/api/admin/exam-catalogue/families", { data: { slug } })).status()).toBe(409);

    const variant = await (
      await page.request.post("/api/admin/exam-catalogue/variants", { data: { familyId: family.id, slug: "E2E", name: "E2E version", scoreScale: "CEFR" } })
    ).json();
    const paper = await (
      await page.request.post("/api/admin/exam-catalogue/papers", {
        data: { variantId: variant.id, name: "Reading", durationSeconds: 1200, navigationMode: "FREE_WITHIN_SECTION", allowReview: true },
      })
    ).json();
    const part = await (await page.request.post("/api/admin/exam-catalogue/parts", { data: { paperId: paper.id, name: "Passage 1" } })).json();

    const renamed = await page.request.patch(`/api/admin/exam-catalogue/parts/${part.id}`, { data: { name: "Passage One", prepSeconds: 15 } });
    expect((await renamed.json()).name).toBe("Passage One");

    // Template linking: wrong-format part refused; right one accepted.
    const bad = await page.request.post("/api/admin/templates", {
      data: { name: "e2e bad", sections: [{ category: "READING_COMPREHENSION", difficulty: "BEGINNER", questionCount: 1, examPartId: part.id }] },
    });
    expect(bad.status()).toBe(400); // part without a format
    const created = await page.request.post("/api/admin/templates", {
      data: {
        name: `e2e linked ${Date.now()}`,
        examVariantId: variant.id,
        sections: [{ category: "READING_COMPREHENSION", difficulty: "BEGINNER", questionCount: 1, examPartId: part.id }],
      },
    });
    expect(created.status()).toBe(201);
    templateId = (await created.json()).id;
    const listed = (await (await page.request.get("/api/admin/templates")).json()).templates.find((t: { id: string }) => t.id === templateId);
    expect(listed.examVariantId).toBe(variant.id);
    expect(listed.sections[0].examPartId).toBe(part.id);

    // Editing the template without mentioning examVariantId keeps the link
    // (this is what the existing "Set as default" button sends).
    await page.request.patch(`/api/admin/templates/${templateId}`, { data: { name: listed.name, sections: listed.sections } });
    expect((await db.mockTestTemplate.findUniqueOrThrow({ where: { id: templateId! } })).examVariantId).toBe(variant.id);

    // Deletes refused while the template uses them.
    for (const path of [`parts/${part.id}`, `papers/${paper.id}`, `variants/${variant.id}`, `families/${family.id}`]) {
      const res = await page.request.delete(`/api/admin/exam-catalogue/${path}`);
      expect(res.status(), path).toBe(409);
    }

    await page.request.delete(`/api/admin/templates/${templateId}`);
    templateId = null;
    expect((await page.request.delete(`/api/admin/exam-catalogue/families/${family.id}`)).ok()).toBe(true);

    const actions = (await db.adminAuditLog.findMany({ where: { adminId: user.id }, select: { action: true } })).map((a) => a.action);
    for (const expected of ["EXAM_FAMILY_CREATED", "EXAM_VARIANT_CREATED", "EXAM_PAPER_CREATED", "EXAM_PART_CREATED", "EXAM_PART_UPDATED", "TEMPLATE_CREATED", "EXAM_FAMILY_DELETED"]) {
      expect(actions, expected).toContain(expected);
    }
  } finally {
    if (templateId) await db.mockTestTemplate.deleteMany({ where: { id: templateId } });
    await db.examFamily.deleteMany({ where: { id: family.id } });
  }
});

test("item groups + bulk import, and newer types never reach today's practice screen", async ({ page }) => {
  test.setTimeout(180_000);
  await admin(page, "groups");
  const run = Date.now();

  const group = await (await page.request.post("/api/admin/item-groups", { data: { type: "PASSAGE", title: `e2e ${run}`, text: "The museum opens at ten." } })).json();
  try {
    // Import a newer-type question straight into the group, ACTIVE, into a
    // category/difficulty that today's practice screen serves.
    const imported = await (
      await page.request.post("/api/admin/questions", {
        data: {
          allowDuplicates: true,
          questions: [
            {
              category: "GRAMMAR",
              difficulty: "BEGINNER",
              type: "TRUE_FALSE_NOT_GIVEN",
              prompt: `e2e-${run} The museum opens at ten.`,
              correctAnswer: "TRUE",
              timeLimitSeconds: 30,
              isActive: true,
              itemGroupId: group.id,
              orderInGroup: 1,
            },
          ],
        },
      })
    ).json();
    expect(imported.inserted).toBe(1);
    const q = await db.practiceQuestion.findFirstOrThrow({ where: { prompt: `e2e-${run} The museum opens at ten.` } });
    expect(q.itemGroupId).toBe(group.id);

    const detail = await (await page.request.get(`/api/admin/item-groups/${group.id}`)).json();
    expect(detail.questions.map((x: { id: string }) => x.id)).toEqual([q.id]);
    expect((await page.request.delete(`/api/admin/item-groups/${group.id}`)).status()).toBe(409);

    // The guard: an ACTIVE, newer-type question in GRAMMAR/BEGINNER is
    // never served by today's practice endpoint.
    const practice = await (await page.request.get("/api/practice/questions?category=GRAMMAR&difficulty=BEGINNER&count=10")).json();
    expect(practice.questions.length).toBeGreaterThan(0); // the original questions still come through
    expect(practice.questions.map((x: { id: string }) => x.id)).not.toContain(q.id);
    for (const served of practice.questions) {
      expect(["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "SHORT_ANSWER"]).toContain(served.type);
    }

    await db.practiceQuestion.delete({ where: { id: q.id } });
    expect((await page.request.delete(`/api/admin/item-groups/${group.id}`)).ok()).toBe(true);
  } finally {
    await db.practiceQuestion.deleteMany({ where: { prompt: `e2e-${run} The museum opens at ten.` } });
    await db.itemGroup.deleteMany({ where: { id: group.id } });
  }
});
