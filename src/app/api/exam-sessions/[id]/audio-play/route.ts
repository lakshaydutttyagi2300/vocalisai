import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { parsePlan, processExpiry } from "@/lib/exam-runner";

// Grants one play of an AUDIO item group, enforcing ItemGroup.playLimit
// server-side - the count lives in ExamSessionState, not the browser, so
// refreshing doesn't reset it. The asset route only streams audio after
// at least one play has been granted here. Optimistic concurrency
// (updatedAt match) stops two simultaneous clicks from both slipping
// under the limit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const itemGroupId = typeof body?.itemGroupId === "string" ? body.itemGroupId : "";

  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await processExpiry(id);
    if (!state || state.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "This exam has finished." }, { status: 409 });
    }

    const paper = parsePlan(state.planJson).papers[state.currentPaperIndex];
    const inPaper = await db.practiceQuestion.count({
      where: { id: { in: paper.questions.map((q) => q.questionId) }, itemGroupId },
    });
    if (inPaper === 0) return NextResponse.json({ error: "That audio isn't part of the current section." }, { status: 409 });

    const group = await db.itemGroup.findUnique({ where: { id: itemGroupId }, select: { type: true, playLimit: true, assetKey: true } });
    if (!group || group.type !== "AUDIO" || !group.assetKey) {
      return NextResponse.json({ error: "No audio is available for this item." }, { status: 404 });
    }

    const plays = JSON.parse(state.audioPlaysJson) as Record<string, number>;
    const used = plays[itemGroupId] ?? 0;
    if (group.playLimit !== null && used >= group.playLimit) {
      return NextResponse.json({ error: "You've used all the plays allowed for this recording.", playsUsed: used, playLimit: group.playLimit }, { status: 403 });
    }

    plays[itemGroupId] = used + 1;
    const updated = await db.examSessionState.updateMany({
      where: { id: state.id, updatedAt: state.updatedAt },
      data: { audioPlaysJson: JSON.stringify(plays) },
    });
    if (updated.count > 0) {
      return NextResponse.json({ playsUsed: used + 1, playLimit: group.playLimit });
    }
  }
  return NextResponse.json({ error: "Please try again." }, { status: 409 });
}
