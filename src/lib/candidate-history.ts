// A candidate's own history, for the candidate-facing "My results" and
// "Speech Analysis" pages and the dashboard. Read-only; every number comes
// from stored rows (score reports, graded exam answers, speech analyses) -
// nothing is estimated here.

import { db } from "@/lib/db";
import { getModeBySlug, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import type { Rating } from "@/lib/providers/gemini-analysis-provider";

export interface MockExamRow {
  sessionId: string;
  name: string;
  kind: "standard" | "exam";
  startedAt: Date;
  status: "completed" | "in_progress" | "ended";
  href: string;
  // standard: overall 0-100 from the score report; exam: correct / auto-marked
  overallScore: number | null;
  correct: number | null;
  marked: number | null;
}

export async function listMockExams(userId: string, take = 50): Promise<MockExamRow[]> {
  const sessions = await db.mockTestSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      template: { select: { name: true } },
      scoreReport: { select: { overallScore: true } },
      examSessionState: { select: { status: true } },
      itemResponses: { select: { isCorrect: true } },
      _count: { select: { attempts: true } },
    },
  });

  return sessions.map((s) => {
    const isExam = !!s.examSessionState;
    const marked = isExam ? s.itemResponses.filter((r) => r.isCorrect !== null).length : null;
    const correct = isExam ? s.itemResponses.filter((r) => r.isCorrect === true).length : null;
    const status: MockExamRow["status"] = isExam
      ? s.examSessionState!.status === "COMPLETED"
        ? "completed"
        : "in_progress"
      : s.endedAt
        ? "completed"
        : "ended";
    return {
      sessionId: s.id,
      name: s.template?.name ?? "Mock assessment",
      kind: isExam ? "exam" : "standard",
      startedAt: s.startedAt,
      status,
      href: isExam ? `/exam/results/${s.id}` : `/mock-tests/results/${s.id}`,
      overallScore: s.scoreReport?.overallScore ?? null,
      correct,
      marked,
    };
  });
}

export interface SpeechAnalysisRow {
  attemptId: string;
  createdAt: Date;
  modeLabel: string;
  difficulty: string;
  score: number | null;
  wpm: number;
  pace: string;
  fillerCount: number;
  durationSeconds: number;
  ratings: { pronunciation: Rating | null; fluency: Rating | null; grammar: Rating | null };
  fromMockTest: boolean;
}

function ratingOf(ai: Record<string, unknown> | null, key: string): Rating | null {
  const r = (ai?.[key] as { rating?: unknown } | undefined)?.rating;
  return r === "strong" || r === "adequate" || r === "weak" ? r : null;
}

export async function listSpeechAnalyses(userId: string, take = 50): Promise<SpeechAnalysisRow[]> {
  const attempts = await db.practiceAttempt.findMany({
    where: { userId, analysis: { isNot: null } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      category: true,
      difficulty: true,
      score: true,
      mockTestSessionId: true,
      analysis: { select: { wpm: true, paceClassification: true, fillerCount: true, durationSeconds: true, aiAnalysisJson: true } },
    },
  });

  return attempts.map((a) => {
    let ai: Record<string, unknown> | null = null;
    try {
      ai = JSON.parse(a.analysis!.aiAnalysisJson);
    } catch {
      ai = null;
    }
    const slug = PRACTICE_MODES.find((m) => m.category === a.category)?.slug;
    return {
      attemptId: a.id,
      createdAt: a.createdAt,
      modeLabel: (slug && getModeBySlug(slug)?.label) || a.category,
      difficulty: a.difficulty,
      score: a.score,
      wpm: Math.round(a.analysis!.wpm),
      pace: a.analysis!.paceClassification,
      fillerCount: a.analysis!.fillerCount,
      durationSeconds: Math.round(a.analysis!.durationSeconds),
      ratings: { pronunciation: ratingOf(ai, "pronunciation"), fluency: ratingOf(ai, "fluency"), grammar: ratingOf(ai, "grammar") },
      fromMockTest: !!a.mockTestSessionId,
    };
  });
}

// Exam-style practice tests (runner v2): correct answers per paper
// (Listening, Reading, ...) across every COMPLETED sitting, from the
// graded ItemResponse rows. Papers with nothing auto-marked (Writing,
// Speaking) are reported with how many responses were submitted instead.
export interface ExamPaperStat {
  paper: string;
  sittings: number;
  correct: number;
  marked: number;
  responses: number;
}

export async function examPaperStats(userId: string): Promise<{ completedSittings: number; papers: ExamPaperStat[] }> {
  const sessions = await db.mockTestSession.findMany({
    where: { userId, examSessionState: { status: "COMPLETED" } },
    select: {
      examSessionState: { select: { planJson: true } },
      itemResponses: { select: { questionId: true, isCorrect: true, answerJson: true } },
    },
  });

  const byPaper = new Map<string, ExamPaperStat>();
  const order: string[] = [];
  for (const s of sessions) {
    let plan: { papers: { name: string; questions: { questionId: string }[] }[] };
    try {
      plan = JSON.parse(s.examSessionState!.planJson);
    } catch {
      continue;
    }
    const responses = new Map(s.itemResponses.map((r) => [r.questionId, r]));
    for (const paper of plan.papers) {
      let stat = byPaper.get(paper.name);
      if (!stat) {
        stat = { paper: paper.name, sittings: 0, correct: 0, marked: 0, responses: 0 };
        byPaper.set(paper.name, stat);
        order.push(paper.name);
      }
      stat.sittings++;
      for (const q of paper.questions) {
        const r = responses.get(q.questionId);
        if (!r) continue;
        if (r.isCorrect !== null) {
          stat.marked++;
          if (r.isCorrect) stat.correct++;
        } else if (r.answerJson) {
          stat.responses++;
        }
      }
    }
  }
  return { completedSittings: sessions.length, papers: order.map((n) => byPaper.get(n)!) };
}

// Voice attempts that were recorded but never analysed (e.g. analysis was
// turned off, or the candidate left before it ran) - listed so they can be
// opened and analysed from their results page.
export async function countUnanalysedRecordings(userId: string): Promise<number> {
  return db.practiceAttempt.count({ where: { userId, recordingId: { not: null }, analysis: { is: null } } });
}
