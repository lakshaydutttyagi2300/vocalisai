import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { buildStateView, parsePlan, processExpiry } from "@/lib/exam-runner";

// Forward-only step for LOCKED_SEQUENTIAL papers. The server holds the
// candidate's position, so refreshing the page can't be used to go back.
// `fromIndex` makes a double-click harmless: the move only happens if the
// candidate is still on the question they were advancing from.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const fromIndex = Number(body?.fromIndex);

  const state = await processExpiry(id);
  if (!state || state.status !== "IN_PROGRESS") {
    return NextResponse.json(await buildStateView(id));
  }
  const paper = parsePlan(state.planJson).papers[state.currentPaperIndex];
  if (paper.navigationMode !== "LOCKED_SEQUENTIAL") {
    return NextResponse.json({ error: "This section allows free navigation." }, { status: 400 });
  }

  if (Number.isInteger(fromIndex) && fromIndex === state.currentQuestionIndex && fromIndex < paper.questions.length - 1) {
    await db.examSessionState.updateMany({
      where: { id: state.id, currentPaperIndex: state.currentPaperIndex, currentQuestionIndex: fromIndex },
      data: { currentQuestionIndex: fromIndex + 1 },
    });
  }
  return NextResponse.json(await buildStateView(id));
}
