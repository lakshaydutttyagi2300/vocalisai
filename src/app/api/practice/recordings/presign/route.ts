import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { extensionForMimeType } from "@/lib/uploads";
import { isR2Configured, getPresignedUploadUrl } from "@/lib/storage";

// Step 1 of the direct-to-R2 upload flow: mint a recordingId/key and a
// short-lived signed PUT URL. Deliberately does NOT create the
// PracticeRecording row yet - that only happens once /complete confirms
// the bytes actually landed in R2, so a failed upload never leaves a row
// pointing at nothing (see src/app/api/practice/recordings/complete/route.ts).
//
// When R2 isn't configured (local dev without it), tells the client to
// fall back to uploading through our own server instead - the original
// multipart-through-the-server route (src/app/api/practice/recordings)
// still exists and still works for that case.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ mode: "server" });
  }

  const body = await req.json().catch(() => null);
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/webm";

  const recordingId = crypto.randomUUID();
  const ext = extensionForMimeType(mimeType);
  const key = `recordings/${session.user.id}/${recordingId}.${ext}`;

  const uploadUrl = await getPresignedUploadUrl(key, mimeType);

  return NextResponse.json({ mode: "direct", recordingId, key, uploadUrl });
}
