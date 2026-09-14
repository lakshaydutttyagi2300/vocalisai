import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mockTestSession = await db.mockTestSession.findUnique({
    where: { id },
    include: {
      attempts: { orderBy: { createdAt: "asc" }, include: { question: true } },
      events: true,
      template: { include: { sections: { orderBy: { order: "asc" } } } },
    },
  });
  if (!mockTestSession || mockTestSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bySection = (mockTestSession.template?.sections ?? []).map((section) => {
    const sectionAttempts = mockTestSession.attempts.filter((a) => a.category === section.category);
    const scored = sectionAttempts.filter((a) => a.score !== null);
    return {
      category: section.category,
      difficulty: section.difficulty,
      questionCount: section.questionCount,
      answeredCount: sectionAttempts.length,
      correctCount: scored.filter((a) => a.isCorrect).length,
      scoredCount: scored.length,
      attempts: sectionAttempts.map((a) => ({
        attemptId: a.id,
        prompt: a.question.prompt,
        isCorrect: a.isCorrect,
        score: a.score,
        hasRecording: !!a.recordingId,
      })),
    };
  });

  return NextResponse.json({
    sessionId: mockTestSession.id,
    startedAt: mockTestSession.startedAt,
    endedAt: mockTestSession.endedAt,
    templateName: mockTestSession.template?.name ?? null,
    totalQuestions: mockTestSession.attempts.length,
    proctoringEventCount: mockTestSession.events.length,
    sections: bySection,
  });
}
