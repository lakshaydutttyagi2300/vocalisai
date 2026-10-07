// Who may have a certificate for a mock exam - decided only here, on the
// server, from the database (never from anything the browser sends):
//   1. the session belongs to the signed-in user;
//   2. the user's plan is a paid one right now (getEffectivePlan: an expired
//      paid plan counts as Free);
//   3. the test really finished, and every question in it has an answer
//      (owner's rule: 100% answered - a timed-out or blank question doesn't count);
//   4. the score is final, for tests that have an overall score.
// An already-issued certificate is always returned to its owner, even if the
// plan has lapsed since: what was earned stays earned.

import { db } from "@/lib/db";
import { getEffectivePlan } from "@/lib/entitlements";
import { processExpiry, parsePlan } from "@/lib/exam-runner";
import { isSupportAssessment } from "@/lib/support-assessment/config";
import { parseSupportReport } from "@/lib/support-assessment/marking";

/** Score at or above this = Certificate of Achievement; below = Completion. */
export const ACHIEVEMENT_SCORE = 70;

export type IneligibleReason = "NOT_FOUND" | "NOT_PAID" | "IN_PROGRESS" | "INCOMPLETE" | "SCORE_PENDING" | "NO_NAME";

export interface CertificateFacts {
  recipientName: string;
  testName: string;
  kind: "ACHIEVEMENT" | "COMPLETION";
  score: number | null;
  completedAt: Date;
}

export type Eligibility =
  | { eligible: true; facts: CertificateFacts }
  | { eligible: false; reason: IneligibleReason; message: string; answered?: number; total?: number };

const no = (reason: IneligibleReason, message: string, extra: { answered?: number; total?: number } = {}): Eligibility => ({ eligible: false, reason, message, ...extra });

function answeredJson(answerJson: string | null): boolean {
  if (!answerJson) return false;
  try {
    const v = JSON.parse(answerJson) as unknown;
    if (v === null || v === "") return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  } catch {
    return false;
  }
}

export async function checkCertificateEligibility(sessionId: string, userId: string): Promise<Eligibility> {
  const session = await db.mockTestSession.findUnique({
    where: { id: sessionId },
    include: {
      user: { select: { name: true } },
      template: { include: { sections: true, examVariant: { include: { family: true } } } },
      scoreReport: true,
    },
  });
  if (!session || session.userId !== userId) return no("NOT_FOUND", "We couldn't find that test.");

  if ((await getEffectivePlan(userId)) === "FREE") {
    return no("NOT_PAID", "Certificates are part of the paid plans. Upgrade to get a certificate for your completed tests.");
  }

  const testName = session.template?.name ?? "Mock Assessment";
  let answered = 0;
  let total = 0;
  let completedAt: Date | null = null;
  let score: number | null = null;

  const state = session.template?.examVariantId ? await processExpiry(sessionId) : null;
  if (state) {
    // Timed exam (v2): every section submitted, every planned question answered.
    if (state.status !== "COMPLETED") return no("IN_PROGRESS", "Finish the test to get your certificate.");
    const questionIds = parsePlan(state.planJson).papers.flatMap((p) => p.questions.map((q) => q.questionId));
    const responses = await db.itemResponse.findMany({ where: { mockTestSessionId: sessionId, questionId: { in: questionIds } }, select: { answerJson: true } });
    total = questionIds.length;
    answered = responses.filter((r) => answeredJson(r.answerJson)).length;
    completedAt = state.completedAt ?? session.endedAt;
    if (isSupportAssessment(session.template?.examVariant)) {
      const report = parseSupportReport(session.scoreReport?.categoryScoresJson);
      if (report?.status !== "done" || report.result?.overall == null) {
        return no("SCORE_PENDING", "Your score is still being marked. Open your results, then try again.");
      }
      score = report.result.overall;
    }
  } else {
    // Section-by-section mock exam (v1): ended, and an answer for every question in the template.
    if (!session.endedAt) return no("IN_PROGRESS", "Finish the test to get your certificate.");
    total = session.template?.sections.reduce((n, s) => n + s.questionCount, 0) ?? 0;
    const attempts = await db.practiceAttempt.findMany({ where: { mockTestSessionId: sessionId }, select: { questionId: true, responseText: true, recordingId: true } });
    answered = new Set(attempts.filter((a) => a.recordingId || (a.responseText ?? "").trim()).map((a) => a.questionId)).size;
    completedAt = session.endedAt;
    if (session.scoreReport?.overallScore == null) {
      return no("SCORE_PENDING", "Your score is still being calculated. Open your results, then try again.");
    }
    score = session.scoreReport.overallScore;
  }

  if (total === 0 || answered < total) {
    return no("INCOMPLETE", `Certificates need every question answered. You answered ${answered} of ${total}.`, { answered, total });
  }

  const recipientName = (session.user.name ?? "").trim();
  if (!recipientName) return no("NO_NAME", "Add your full name in your profile first: it's printed on the certificate.");

  return {
    eligible: true,
    facts: {
      recipientName,
      testName,
      kind: score !== null && score >= ACHIEVEMENT_SCORE ? "ACHIEVEMENT" : "COMPLETION",
      score,
      completedAt: completedAt ?? new Date(),
    },
  };
}
