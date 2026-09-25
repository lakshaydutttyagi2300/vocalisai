import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { parsePlan, processExpiry } from "@/lib/exam-runner";
import { getQuestionTypeDef } from "@/lib/question-types";

// Autosave for one answer. Every check is server-side: the paper must
// still be open (processExpiry has already auto-submitted it if not), the
// question must belong to the CURRENT paper, a forward-only paper only
// accepts the question the candidate is currently on, and the answer must
// match that question type's schema. A recording can only be linked if it
// belongs to the caller.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const questionId = typeof body?.questionId === "string" ? body.questionId : "";
  const answer = body?.answer === undefined ? null : body.answer;
  const flagged = body?.flagged === true;

  const state = await processExpiry(id);
  if (!state) return NextResponse.json({ error: "This exam hasn't been started." }, { status: 404 });
  if (state.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This exam has finished - answers can no longer be changed." }, { status: 409 });
  }

  const plan = parsePlan(state.planJson);
  const paper = plan.papers[state.currentPaperIndex];
  const questionIndex = paper.questions.findIndex((q) => q.questionId === questionId);
  if (questionIndex === -1) {
    return NextResponse.json({ error: "That question isn't part of the current section." }, { status: 409 });
  }
  if (paper.navigationMode === "LOCKED_SEQUENTIAL" && questionIndex !== state.currentQuestionIndex) {
    return NextResponse.json({ error: "In this section you can only answer the current question." }, { status: 409 });
  }

  const question = await db.practiceQuestion.findUnique({ where: { id: questionId }, select: { type: true } });
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  if (answer !== null) {
    const def = getQuestionTypeDef(question.type);
    if (!def || !def.answerSchema.safeParse(answer).success) {
      return NextResponse.json({ error: "That answer isn't in a valid format for this question." }, { status: 400 });
    }
    if (question.type === "TIMED_SPEAKING") {
      const recording = await db.practiceRecording.findUnique({ where: { id: (answer as { recordingId: string }).recordingId } });
      if (!recording || recording.userId !== guard.userId) {
        return NextResponse.json({ error: "Invalid recording." }, { status: 400 });
      }
    }
  }

  const answerJson = answer === null ? null : JSON.stringify(answer);
  const saved = await db.itemResponse.upsert({
    where: { mockTestSessionId_questionId: { mockTestSessionId: id, questionId } },
    update: { answerJson, flaggedForReview: flagged },
    create: { mockTestSessionId: id, questionId, paperIndex: state.currentPaperIndex, answerJson, flaggedForReview: flagged },
  });

  return NextResponse.json({ saved: true, updatedAt: saved.updatedAt.toISOString() });
}
