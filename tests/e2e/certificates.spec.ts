import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Certificates through the real server: issued only to a paid user for a
// fully answered test of their own, the same one on every request, a PDF for
// its owner only, and a public verification page that shows no account data.
const password = "correct-horse-battery-staple";
const stamp = Date.now();
let templateId = "";

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-cert-${stamp}` } } });
  if (templateId) await db.mockTestTemplate.deleteMany({ where: { id: templateId } });
});

async function finishedTest(userId: string) {
  const questions = await db.practiceQuestion.findMany({ where: { isActive: true, category: "GRAMMAR" }, take: 2, select: { id: true, skillId: true, level: true } });
  if (!templateId) templateId = (await db.mockTestTemplate.create({ data: { name: `E2E Certificate Assessment ${stamp}`, sections: { create: [{ order: 1, category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 2 }] } } })).id;
  const session = await db.mockTestSession.create({ data: { userId, templateId, endedAt: new Date() } });
  for (const q of questions) {
    await db.practiceAttempt.create({ data: { userId, questionId: q.id, skillId: q.skillId, level: q.level, category: "GRAMMAR", difficulty: "BEGINNER", timeTakenSeconds: 9, mockTestSessionId: session.id, responseText: "answer" } });
  }
  await db.scoreReport.create({ data: { mockTestSessionId: session.id, overallScore: 78, categoryScoresJson: "{}" } });
  return session.id;
}

test("a paid user gets one verifiable certificate; free users and other users don't", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const email = `e2e-cert-${stamp}-paid@example.test`;
  const paid = await createTestUser(email, password, "Meera Joshi");
  await setPlan(paid.id, "STARTER", { periodDays: 30 });
  const sessionId = await finishedTest(paid.id);
  await page.goto("/");
  await loginAs(page, email, password);

  const first = await (await page.request.post("/api/certificates", { data: { sessionId } })).json();
  expect(first).toMatchObject({ status: "ready", created: true, certificate: { recipientName: "Meera Joshi", kind: "ACHIEVEMENT", score: 78 } });
  const again = await (await page.request.post("/api/certificates", { data: { sessionId } })).json();
  expect(again).toMatchObject({ status: "ready", created: false, certificate: { code: first.certificate.code } });
  const code: string = first.certificate.code;

  const pdf = await page.request.get(`/api/certificates/${code}/pdf?download=1`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // The owner's page, then a new design that sticks.
  await page.goto(`/certificates/${code}`);
  await expect(page.getByRole("link", { name: /Download certificate/ })).toBeVisible();
  expect((await page.request.patch(`/api/certificates/${code}`, { data: { design: "seal:emerald" } })).ok()).toBe(true);
  expect((await db.certificate.findUnique({ where: { code } }))?.design).toBe("seal:emerald");

  // Signed out: the public check shows the certificate; the PDF stays private.
  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  await v.goto(`/verify/${code}`);
  await expect(v.getByRole("heading", { name: "Valid certificate" })).toBeVisible();
  await expect(v.getByText("Meera Joshi")).toBeVisible();
  expect(await v.content()).not.toContain(email);
  expect((await v.request.get(`/api/certificates/${code}/pdf`)).status()).toBe(401);
  await v.goto("/verify/VAI-0000-0000-0000");
  await expect(v.getByRole("heading", { name: "No certificate with this ID" })).toBeVisible();

  // Someone else can't get (or read) this user's certificate.
  const otherEmail = `e2e-cert-${stamp}-other@example.test`;
  const other = await createTestUser(otherEmail, password);
  await setPlan(other.id, "STARTER", { periodDays: 30 });
  await v.goto("/");
  await loginAs(v, otherEmail, password);
  expect((await v.request.post("/api/certificates", { data: { sessionId } })).status()).toBe(404);
  expect((await v.request.get(`/api/certificates/${code}/pdf`)).status()).toBe(404);
  await visitor.close();
});

test("a free user is told why there is no certificate", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-cert-${stamp}-free@example.test`;
  const free = await createTestUser(email, password);
  const sessionId = await finishedTest(free.id);
  await page.goto("/");
  await loginAs(page, email, password);
  const res = await (await page.request.post("/api/certificates", { data: { sessionId } })).json();
  expect(res).toMatchObject({ status: "unavailable", reason: "NOT_PAID" });
  expect(await db.certificate.count({ where: { mockTestSessionId: sessionId } })).toBe(0);
});
