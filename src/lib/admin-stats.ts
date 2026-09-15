// Deterministic admin-facing aggregation (Phase 17) - real counts and sums
// over already-persisted rows, no AI call, no estimation. Cost figures are
// the same estimatedCostUsd values already stored per-row when each paid
// AI call happened (Phase 8/14/15), just summed here.

import { db } from "@/lib/db";

export interface AdminOverview {
  totalUsers: number;
  totalCandidates: number;
  totalAdmins: number;
  mockSessionsCompleted: number;
  totalPracticeAttempts: number;
  estimatedCostUsd: {
    transcriptionAndAnalysis: number; // SpeechAnalysis rows
    resultsReports: number; // ResultsReport rows
    coachChat: number; // CoachMessage rows (coach turns only)
    generatedScenarios: number; // PracticeQuestion rows with source = AI_GENERATED
    improvedAnswers: number; // SpeechAnalysis rows with improvedAnswerJson set
    total: number;
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [
    totalUsers,
    totalAdmins,
    mockSessionsCompleted,
    totalPracticeAttempts,
    speechAnalysisCost,
    resultsReportCost,
    coachChatCost,
    generatedScenarioCost,
    improvedAnswerCost,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.mockTestSession.count({ where: { scoreReport: { isNot: null } } }),
    db.practiceAttempt.count(),
    db.speechAnalysis.aggregate({ _sum: { estimatedCostUsd: true } }),
    db.resultsReport.aggregate({ _sum: { estimatedCostUsd: true } }),
    db.coachMessage.aggregate({ where: { role: "coach" }, _sum: { estimatedCostUsd: true } }),
    db.practiceQuestion.aggregate({ where: { source: "AI_GENERATED" }, _sum: { estimatedCostUsd: true } }),
    db.speechAnalysis.aggregate({ where: { improvedAnswerJson: { not: null } }, _sum: { improvedAnswerCostUsd: true } }),
  ]);

  const transcriptionAndAnalysis = speechAnalysisCost._sum.estimatedCostUsd ?? 0;
  const resultsReports = resultsReportCost._sum.estimatedCostUsd ?? 0;
  const coachChat = coachChatCost._sum.estimatedCostUsd ?? 0;
  const generatedScenarios = generatedScenarioCost._sum.estimatedCostUsd ?? 0;
  const improvedAnswers = improvedAnswerCost._sum.improvedAnswerCostUsd ?? 0;

  return {
    totalUsers,
    totalCandidates: totalUsers - totalAdmins,
    totalAdmins,
    mockSessionsCompleted,
    totalPracticeAttempts,
    estimatedCostUsd: {
      transcriptionAndAnalysis,
      resultsReports,
      coachChat,
      generatedScenarios,
      improvedAnswers,
      total: transcriptionAndAnalysis + resultsReports + coachChat + generatedScenarios + improvedAnswers,
    },
  };
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  mockSessionsCompleted: number;
  averageOverallScore: number | null;
  totalPracticeAttempts: number;
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const [users, reports, attemptCounts] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    db.scoreReport.findMany({ select: { overallScore: true, mockTestSession: { select: { userId: true } } } }),
    db.practiceAttempt.groupBy({ by: ["userId"], _count: { _all: true } }),
  ]);

  const scoresByUser = new Map<string, number[]>();
  for (const r of reports) {
    if (r.overallScore === null) continue;
    const uid = r.mockTestSession.userId;
    const arr = scoresByUser.get(uid) ?? [];
    arr.push(r.overallScore);
    scoresByUser.set(uid, arr);
  }
  const attemptCountByUser = new Map(attemptCounts.map((a) => [a.userId, a._count._all]));

  return users.map((u) => {
    const scores = scoresByUser.get(u.id) ?? [];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      mockSessionsCompleted: scores.length,
      averageOverallScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      totalPracticeAttempts: attemptCountByUser.get(u.id) ?? 0,
    };
  });
}
