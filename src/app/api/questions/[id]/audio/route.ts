import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { readRecording } from "@/lib/storage";
import { generatedAudioKey } from "@/lib/question-stimulus";

// Streams a question's generated listening recording (see
// prisma/generate-question-audio.mjs) to a signed-in user. Only ever the
// key recorded on that question's own audio spec - validated to be a
// question-audio/ file that still matches the current script - so this can't
// be used to fetch any other stored file. A missing/stale recording is a 404,
// and the candidate's player then falls back to the browser's voices.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const question = await db.practiceQuestion.findUnique({ where: { id }, select: { passage: true, isActive: true } });
  const key = question?.isActive ? generatedAudioKey(question.passage) : null;
  if (!key) return NextResponse.json({ error: "No recording for this question." }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readRecording(key);
  } catch {
    return NextResponse.json({ error: "The recording couldn't be loaded." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": key.endsWith(".mp3") ? "audio/mpeg" : "audio/wav",
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
