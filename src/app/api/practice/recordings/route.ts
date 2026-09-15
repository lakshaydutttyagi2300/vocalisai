import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extensionForMimeType } from "@/lib/uploads";
import { writeRecording } from "@/lib/storage";

// Stores a candidate's own voice recording. Written under
// uploads/recordings/<userId>/ and the DB row is scoped to that same
// userId, so playback (see [id]/route.ts) can never serve one user's
// recording to another.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  const durationRaw = form.get("durationSeconds");

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No recording file received." }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Recording is too large (max 25MB)." }, { status: 413 });
  }

  const mimeType = file.type || "audio/webm";
  const recordingId = crypto.randomUUID();
  const ext = extensionForMimeType(mimeType);
  // Forward slashes, not path.join's platform separator - this key is
  // also used as an S3/R2 object key (src/lib/storage.ts), which is
  // always "/"-delimited regardless of the server's OS.
  const relativePath = `recordings/${session.user.id}/${recordingId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeRecording(relativePath, buffer, mimeType);

  const durationSeconds = durationRaw ? Math.round(Number(durationRaw)) : null;

  const recording = await db.practiceRecording.create({
    data: {
      id: recordingId,
      userId: session.user.id,
      filePath: relativePath,
      mimeType,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    },
  });

  return NextResponse.json({ recordingId: recording.id });
}
