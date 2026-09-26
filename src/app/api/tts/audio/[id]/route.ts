import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSpeechId, readSpeech } from "@/lib/tts/service";

// Streams a natural-voice clip made by POST /api/tts. Only files under tts/
// named by their 40-hex content hash can be read here. A clip never
// changes (its name IS a hash of its text and voice), so the browser may
// keep it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isSpeechId(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readSpeech(id);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
