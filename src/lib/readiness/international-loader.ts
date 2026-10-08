// Loads a candidate's evidence for the International Process Readiness score
// (./international.ts): their latest marked Customer Support English
// Assessment and their skill mastery. Server only.

import { db } from "@/lib/db";
import { reconcileUserMastery } from "@/lib/skills/mastery-store";
import { parseSupportReport } from "@/lib/support-assessment/marking";
import { SUPPORT_FAMILY_SLUG, SUPPORT_VARIANT_SLUG } from "@/lib/support-assessment/config";
import { computeInternationalReadiness, type AssessmentEvidence, type InternationalReadiness } from "./international";

const SUPPORT_VARIANT = { slug: SUPPORT_VARIANT_SLUG, family: { slug: SUPPORT_FAMILY_SLUG } };

/** The candidate's most recent fully marked Customer Support English Assessment. */
export async function latestSupportAssessment(userId: string): Promise<AssessmentEvidence | null> {
  const sessions = await db.mockTestSession.findMany({
    where: { userId, template: { examVariant: SUPPORT_VARIANT }, scoreReport: { isNot: null } },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: { startedAt: true, endedAt: true, scoreReport: { select: { categoryScoresJson: true } }, examSessionState: { select: { completedAt: true } } },
  });
  for (const s of sessions) {
    const report = parseSupportReport(s.scoreReport?.categoryScoresJson);
    if (report?.status !== "done" || report.result?.overall == null) continue;
    const components = Object.fromEntries(report.result.components.filter((c) => !c.pending).map((c) => [c.key, { points: c.points, max: c.max }]));
    return { completedAt: s.examSessionState?.completedAt ?? s.endedAt ?? s.startedAt, components };
  }
  return null;
}

/** The template that starts the Customer Support English Assessment, if it is set up. */
export async function supportAssessmentTemplateId(): Promise<string | null> {
  const t = await db.mockTestTemplate.findFirst({ where: { examVariant: { ...SUPPORT_VARIANT, isActive: true } }, select: { id: true } });
  return t?.id ?? null;
}

export async function loadInternationalReadiness(userId: string): Promise<InternationalReadiness> {
  const [assessment, mastery] = await Promise.all([latestSupportAssessment(userId), reconcileUserMastery(userId)]);
  return computeInternationalReadiness(assessment, mastery);
}
