import { NextResponse } from "next/server";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { buildStateView, startOrResume } from "@/lib/exam-runner";

// Idempotent: the first call fixes the question plan and starts the
// clock; any later call (a refresh, a reconnect) just resumes it.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const { error } = await startOrResume(id);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const view = await buildStateView(id);
  return NextResponse.json(view);
}
