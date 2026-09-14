import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UPLOADS_ROOT, extensionForMimeType } from "@/lib/uploads";

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
  const relativePath = path.join("recordings", session.user.id, `${recordingId}.${ext}`);
  const absolutePath = path.join(UPLOADS_ROOT, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

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
