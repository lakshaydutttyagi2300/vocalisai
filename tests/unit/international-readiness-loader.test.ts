import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { latestSupportAssessment, loadInternationalReadiness, supportAssessmentTemplateId } from "@/lib/readiness/international-loader";

// The loader against the real database: it finds the candidate's latest
// MARKED Customer Support English Assessment (never one still marking, never
// someone else's) and turns it into the readiness score.
const stamp = Date.now();
let realLoaded = false;
let familyCreated = false;
let familyId = "";
let variantId = "";
let templateId = "";
const users: string[] = [];

const components = [
  { key: "listening", label: "Listening", points: 20, max: 25, pending: false },
  { key: "speaking", label: "Speaking", points: 14, max: 20, pending: false },
  { key: "pronunciation", label: "Pronunciation", points: 12, max: 15, pending: false },
  { key: "fluency", label: "Fluency", points: 9, max: 15, pending: false },
  { key: "grammarVocabulary", label: "Grammar & vocabulary", points: 9, max: 10, pending: false },
  { key: "customerHandling", label: "Customer handling", points: 12, max: 15, pending: false },
];
const report = (status: "done" | "marking", overall: number | null) =>
  JSON.stringify({ supportAssessment: { status, speech: {}, ratings: {}, result: overall === null ? null : { overall, components, strengths: [], weaknesses: [], priorities: [] }, costUsd: 0 } });

async function finishedAssessment(userId: string, startedAt: Date, status: "done" | "marking", overall: number | null) {
  const s = await db.mockTestSession.create({ data: { userId, templateId, startedAt, endedAt: new Date(startedAt.getTime() + 1_800_000) } });
  await db.scoreReport.create({ data: { mockTestSessionId: s.id, overallScore: overall, categoryScoresJson: report(status, overall) } });
}

beforeAll(async () => {
  realLoaded = !!(await db.examVariant.findFirst({ where: { slug: "CUSTOMER_SUPPORT_BPO" } }));
  if (realLoaded) return; // the real assessment is in this database; these tests need their own copy
  let family = await db.examFamily.findUnique({ where: { slug: "CUSTOMER_SERVICE_ENGLISH" } });
  if (!family) {
    family = await db.examFamily.create({ data: { slug: "CUSTOMER_SERVICE_ENGLISH", name: "Customer Service English" } });
    familyCreated = true;
  }
  familyId = family.id;
  variantId = (await db.examVariant.create({ data: { familyId, slug: "CUSTOMER_SUPPORT_BPO", name: `Readiness test ${stamp}`, scoreScale: "PASS_MERIT_DISTINCTION" } })).id;
  templateId = (await db.mockTestTemplate.create({ data: { name: `Readiness test ${stamp}`, examVariantId: variantId } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } }); // sessions and reports cascade
  if (templateId) await db.mockTestTemplate.deleteMany({ where: { id: templateId } });
  if (variantId) await db.examVariant.deleteMany({ where: { id: variantId } });
  if (familyCreated) await db.examFamily.deleteMany({ where: { id: familyId } });
  await db.$disconnect();
});

async function user() {
  const u = await db.user.create({ data: { email: `readiness-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Readiness Test" } });
  users.push(u.id);
  return u.id;
}

describe("International Process readiness (database)", () => {
  it("uses the latest marked assessment, skipping one still being marked", async ({ skip }) => {
    if (realLoaded) skip();
    const me = await user();
    await finishedAssessment(me, new Date(Date.now() - 2 * 86_400_000), "done", 76);
    await finishedAssessment(me, new Date(Date.now() - 3_600_000), "marking", null);
    const found = await latestSupportAssessment(me);
    expect(found?.components.listening).toEqual({ points: 20, max: 25 });

    const r = await loadInternationalReadiness(me);
    expect(r.overall).toBe(78);
    expect(r.coverage).toBe(80);
  });

  it("never reads someone else's assessment", async ({ skip }) => {
    if (realLoaded) skip();
    const owner = await user();
    const other = await user();
    await finishedAssessment(owner, new Date(), "done", 76);
    expect(await latestSupportAssessment(other)).toBeNull();
    expect((await loadInternationalReadiness(other)).overall).toBeNull();
  });

  it("finds the template that starts the assessment", async ({ skip }) => {
    if (realLoaded) skip();
    expect(await supportAssessmentTemplateId()).toBe(templateId);
  });
});
