import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { buildStateView, submitCurrentPaper } from "@/lib/exam-runner";

// Locks and grades the current paper, then starts the next one's clock
// (or finishes the exam). `paperIndex` must match the paper the server
// thinks is current (re-checked on fresh state inside
// submitCurrentPaper), so a double-click or a stale tab can't submit the
// NEXT paper by accident.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const paperIndex = Number(body?.paperIndex);
  if (!Number.isInteger(paperIndex)) {
    return NextResponse.json({ error: "paperIndex is required." }, { status: 400 });
  }

  const state = await db.examSessionState.findUnique({ where: { mockTestSessionId: id } });
  if (!state) return NextResponse.json({ error: "This exam hasn't been started." }, { status: 404 });

  await submitCurrentPaper(id, paperIndex);
  return NextResponse.json(await buildStateView(id));
}
