import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UPLOADS_ROOT } from "@/lib/uploads";

// Serves a recording back only to the user who owns it - never trusts the
// requested id alone. A recording that exists but belongs to someone else
// returns 404, not 403, so its existence isn't leaked either.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recording = await db.practiceRecording.findUnique({ where: { id } });

  if (!recording || recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const absolutePath = path.join(UPLOADS_ROOT, recording.filePath);

  try {
    const buffer = await fs.readFile(absolutePath);
    // Never cacheable: this is one candidate's private voice recording,
    // and a browser-level cache doesn't know about app sessions - on a
    // shared device, a cached response could leak across accounts.
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": recording.mimeType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Recording file is missing." }, { status: 404 });
  }
}
