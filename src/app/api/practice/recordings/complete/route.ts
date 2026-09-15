import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extensionForMimeType } from "@/lib/uploads";
import { recordingExists } from "@/lib/storage";

// Step 2 of the direct-to-R2 upload flow: the client already PUT the bytes
// straight to the signed URL from /presign - this just confirms it and
// creates the PracticeRecording row. The key is recomputed server-side
// from recordingId/mimeType/session.user.id and checked for an exact
// match, so a client can never claim an object under someone else's
// recordings/<userId>/ prefix as its own.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const recordingId = typeof body?.recordingId === "string" ? body.recordingId : "";
  const key = typeof body?.key === "string" ? body.key : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const durationRaw = body?.durationSeconds;

  const expectedKey = `recordings/${session.user.id}/${recordingId}.${extensionForMimeType(mimeType)}`;
  if (!recordingId || key !== expectedKey) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!(await recordingExists(key))) {
    return NextResponse.json({ error: "Upload not found - it may have failed. Please try again." }, { status: 404 });
  }

  const durationSeconds = durationRaw ? Math.round(Number(durationRaw)) : null;

  const recording = await db.practiceRecording.create({
    data: {
      id: recordingId,
      userId: session.user.id,
      filePath: key,
      mimeType,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    },
  });

  return NextResponse.json({ recordingId: recording.id });
}
