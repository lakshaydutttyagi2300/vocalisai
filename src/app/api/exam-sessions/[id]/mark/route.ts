import { NextResponse } from "next/server";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { markSupportAssessment } from "@/lib/support-assessment/marking";

// Marks a finished Customer Support Assessment (or reports that marking is
// already running / done). No extra charge: the test's one use was counted
// when it started. Safe to call repeatedly - a finished result is returned
// as stored, and transcripts are never redone.
export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const outcome = await markSupportAssessment(id);
  if (outcome.status === "not-ready") return NextResponse.json({ error: outcome.error }, { status: 409 });
  if (outcome.status === "failed") return NextResponse.json({ error: outcome.error }, { status: 502 });
  return NextResponse.json(outcome);
}
