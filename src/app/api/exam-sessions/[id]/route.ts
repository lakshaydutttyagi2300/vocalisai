import { NextResponse } from "next/server";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { buildStateView } from "@/lib/exam-runner";

// Current exam-runner-v2 state. Runs server-side expiry first, so an
// expired paper is already submitted by the time this responds.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const view = await buildStateView(id);
  if (!view) return NextResponse.json({ error: "This exam hasn't been started." }, { status: 404 });
  return NextResponse.json(view);
}
