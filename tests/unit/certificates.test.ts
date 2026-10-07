import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { generateCertificateCode, normalizeCertificateCode } from "@/lib/certificates/code";
import { checkCertificateEligibility } from "@/lib/certificates/eligibility";
import { getOrIssueCertificate } from "@/lib/certificates/issue";
import { DESIGNS, PALETTES, PDF_FONTS, renderCertificateSvg } from "@/lib/certificates/designs";
import { renderCertificatePdf } from "@/lib/certificates/pdf";

const RUN = Date.now();
const users: string[] = [];
const templates: string[] = [];

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } }); // sessions, attempts, certificates cascade
  await db.mockTestTemplate.deleteMany({ where: { id: { in: templates } } });
  await db.$disconnect();
});

async function user(plan: "FREE" | "STARTER", name = "Asha Raman") {
  const u = await db.user.create({ data: { email: `cert-${RUN}-${users.length}@example.test`, passwordHash: "x", name } });
  users.push(u.id);
  if (plan !== "FREE") await setPlan(u.id, plan, { periodDays: 30 });
  return u;
}

/** A finished section-by-section mock exam with `answered` of 2 questions answered and a saved score. */
async function finishedTest(userId: string, opts: { answered?: number; ended?: boolean; score?: number | null } = {}) {
  const questions = await db.practiceQuestion.findMany({ where: { isActive: true, category: "GRAMMAR" }, take: 2, select: { id: true } });
  const template = await db.mockTestTemplate.create({ data: { name: `Certificate test ${RUN}`, sections: { create: [{ order: 1, category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 2 }] } } });
  templates.push(template.id);
  const session = await db.mockTestSession.create({ data: { userId, templateId: template.id, endedAt: opts.ended === false ? null : new Date() } });
  for (const [i, q] of questions.entries()) {
    await db.practiceAttempt.create({
      data: { userId, questionId: q.id, category: "GRAMMAR", difficulty: "BEGINNER", timeTakenSeconds: 10, mockTestSessionId: session.id, responseText: i < (opts.answered ?? 2) ? "an answer" : "" },
    });
  }
  if (opts.score !== null) await db.scoreReport.create({ data: { mockTestSessionId: session.id, overallScore: opts.score ?? 82, categoryScoresJson: "{}" } });
  return session.id;
}

describe("certificate codes", () => {
  it("are VAI-XXXX-XXXX-XXXX and survive casual retyping", () => {
    const code = generateCertificateCode();
    expect(code).toMatch(/^VAI-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(normalizeCertificateCode(code.toLowerCase().replace(/-/g, " "))).toBe(code);
    expect(normalizeCertificateCode("hello")).toBeNull();
  });
});

describe("who may have a certificate (server-side)", () => {
  it("refuses a Free user, even for a fully completed test", async () => {
    const u = await user("FREE");
    const r = await checkCertificateEligibility(await finishedTest(u.id), u.id);
    expect(r).toMatchObject({ eligible: false, reason: "NOT_PAID" });
  });

  it("refuses a test with any question unanswered, or not finished", async () => {
    const u = await user("STARTER");
    expect(await checkCertificateEligibility(await finishedTest(u.id, { answered: 1 }), u.id)).toMatchObject({ eligible: false, reason: "INCOMPLETE", answered: 1, total: 2 });
    expect(await checkCertificateEligibility(await finishedTest(u.id, { ended: false }), u.id)).toMatchObject({ eligible: false, reason: "IN_PROGRESS" });
    expect(await checkCertificateEligibility(await finishedTest(u.id, { score: null }), u.id)).toMatchObject({ eligible: false, reason: "SCORE_PENDING" });
  });

  it("never gives someone else's test", async () => {
    const owner = await user("STARTER");
    const other = await user("STARTER");
    const sessionId = await finishedTest(owner.id);
    expect(await checkCertificateEligibility(sessionId, other.id)).toMatchObject({ eligible: false, reason: "NOT_FOUND" });
    expect((await getOrIssueCertificate(sessionId, other.id)).ok).toBe(false);
  });

  it("issues one certificate per test: achievement at 70+, the same one on every request", async () => {
    const u = await user("STARTER");
    const sessionId = await finishedTest(u.id, { score: 82 });
    const [a, b, c] = await Promise.all([getOrIssueCertificate(sessionId, u.id), getOrIssueCertificate(sessionId, u.id), getOrIssueCertificate(sessionId, u.id)]);
    for (const r of [a, b, c]) expect(r.ok).toBe(true);
    const codes = new Set([a, b, c].map((r) => (r.ok ? r.certificate.code : "")));
    expect(codes.size).toBe(1);
    expect(await db.certificate.count({ where: { mockTestSessionId: sessionId } })).toBe(1);
    expect(a.ok && a.certificate).toMatchObject({ kind: "ACHIEVEMENT", score: 82, recipientName: "Asha Raman" });

    const low = await getOrIssueCertificate(await finishedTest(u.id, { score: 55 }), u.id);
    expect(low.ok && low.certificate.kind).toBe("COMPLETION");
  });

  it("keeps an issued certificate for its owner after the plan lapses", async () => {
    const u = await user("STARTER");
    const sessionId = await finishedTest(u.id);
    const first = await getOrIssueCertificate(sessionId, u.id);
    await db.subscription.update({ where: { userId: u.id }, data: { plan: "FREE" } });
    const again = await getOrIssueCertificate(sessionId, u.id);
    expect(again.ok && first.ok && again.certificate.code === first.certificate.code).toBe(true);
  });
});

describe("designs", () => {
  const view = { recipientName: "Ravi <Kumar> & Co", testName: "Customer Support English Assessment", kind: "ACHIEVEMENT" as const, score: 86, completedAt: "2026-10-07T00:00:00Z", code: "VAI-7K2M-9Q4X-T8RD", verifyUrl: "https://vocalisai.vercel.app/verify/VAI-7K2M-9Q4X-T8RD" };

  it("offers 12 layouts x 5 colours = 60 distinct designs", () => {
    expect(DESIGNS).toHaveLength(60);
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(60);
    expect(new Set(DESIGNS.map((d) => d.layout)).size).toBe(12);
    expect(PALETTES).toHaveLength(5);
  });

  it("every design shows the name (escaped), test, score, date, ID, signature and QR", () => {
    for (const d of DESIGNS) {
      const svg = renderCertificateSvg(view, d.id, PDF_FONTS);
      expect(svg.toLowerCase(), d.id).toContain("ravi &lt;kumar&gt; &amp; co");
      expect(svg.toLowerCase()).not.toContain("<kumar>");
      for (const part of ["Customer Support English Assessment", "86", "7 October 2026", "VAI-7K2M-9Q4X-T8RD", "VocalisAi Assessment Team"]) expect(svg, `${d.id}: ${part}`).toContain(part);
      expect(svg).toMatch(/<path d="M[\d.]+ [\d.]+h/); // the QR modules
    }
  });

  it("draws a real PDF", async () => {
    const pdf = await renderCertificatePdf(view, "classic:navy");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10_000);
  });
});
