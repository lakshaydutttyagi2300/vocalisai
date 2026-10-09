// Loads a candidate's evidence for the International Process Readiness score
// (./international.ts): their latest marked Customer Support English
// Assessment, their skill mastery, and their recent typing tests, marked emails
// and chat simulations. Server only.

import { db } from "@/lib/db";
import { reconcileUserMastery } from "@/lib/skills/mastery-store";
import { parseSupportReport } from "@/lib/support-assessment/marking";
import { SUPPORT_FAMILY_SLUG, SUPPORT_VARIANT_SLUG } from "@/lib/support-assessment/config";
import { typingReadinessScore } from "@/lib/typing/scoring";
import { ASSESSMENT_FRESH_DAYS, computeInternationalReadiness, type AssessmentEvidence, type ChatEvidence, type EmailEvidence, type InternationalReadiness, type TypingEvidence } from "./international";

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

/** The average of the candidate's latest 3 typing tests from the last 90 days, as a 0-100 score. */
export async function recentTyping(userId: string): Promise<TypingEvidence | null> {
  const since = new Date(Date.now() - ASSESSMENT_FRESH_DAYS * 86_400_000);
  const rows = await db.typingResult.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 3, select: { netWpm: true } });
  if (!rows.length) return null;
  return { score: Math.round(rows.reduce((s, r) => s + typingReadinessScore(r.netWpm), 0) / rows.length), tests: rows.length };
}

/** The average score of the candidate's latest 3 AI-marked emails from the last 90 days. */
export async function recentEmails(userId: string): Promise<EmailEvidence | null> {
  const since = new Date(Date.now() - ASSESSMENT_FRESH_DAYS * 86_400_000);
  const rows = await db.emailReview.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 3, select: { score: true } });
  if (!rows.length) return null;
  return { score: Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length), emails: rows.length };
}

/** The average score of the candidate's latest 3 marked chat simulations from the last 90 days. */
export async function recentChats(userId: string): Promise<ChatEvidence | null> {
  const since = new Date(Date.now() - ASSESSMENT_FRESH_DAYS * 86_400_000);
  const rows = await db.chatSimulation.findMany({ where: { userId, status: "DONE", score: { not: null }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 3, select: { score: true } });
  if (!rows.length) return null;
  return { score: Math.round(rows.reduce((s, r) => s + (r.score ?? 0), 0) / rows.length), chats: rows.length };
}

export async function loadInternationalReadiness(userId: string): Promise<InternationalReadiness> {
  const [assessment, mastery, typing, email, chat] = await Promise.all([latestSupportAssessment(userId), reconcileUserMastery(userId), recentTyping(userId), recentEmails(userId), recentChats(userId)]);
  return computeInternationalReadiness(assessment, mastery, new Date(), { typing, email, chat });
}
