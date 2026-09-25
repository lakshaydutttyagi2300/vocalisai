import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readRecording } from "@/lib/storage";
import { guardExamSession } from "@/lib/exam-runner-guard";
import { parsePlan, processExpiry } from "@/lib/exam-runner";

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  m4a: "audio/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
};

// Streams an item group's asset (audio clip, image, chart, video) - only
// for a group used in the CURRENT paper, so a candidate can't fetch a
// later section's stimulus early. Audio additionally requires at least
// one play granted by /audio-play. Honest limitation: once bytes reach a
// browser they can in principle be saved; no-store stops the browser
// caching them, and each new play still has to go through /audio-play.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await params;
  const guard = await guardExamSession(id);
  if (!guard.ok) return guard.response;

  const state = await processExpiry(id);
  if (!state || state.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This exam has finished." }, { status: 409 });
  }

  const paper = parsePlan(state.planJson).papers[state.currentPaperIndex];
  const inPaper = await db.practiceQuestion.count({
    where: { id: { in: paper.questions.map((q) => q.questionId) }, itemGroupId: groupId },
  });
  if (inPaper === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await db.itemGroup.findUnique({ where: { id: groupId }, select: { type: true, assetKey: true } });
  if (!group?.assetKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (group.type === "AUDIO") {
    const plays = JSON.parse(state.audioPlaysJson) as Record<string, number>;
    if ((plays[groupId] ?? 0) < 1) {
      return NextResponse.json({ error: "Press play to start the recording." }, { status: 403 });
    }
  }

  let bytes: Buffer;
  try {
    bytes = await readRecording(group.assetKey);
  } catch {
    return NextResponse.json({ error: "The file couldn't be loaded." }, { status: 404 });
  }

  const ext = group.assetKey.split(".").pop() ?? "";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
