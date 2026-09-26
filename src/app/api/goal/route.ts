import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setUserTrack } from "@/lib/goal-tracks";

// Sets the signed-in candidate's goal (an enabled Goal Track, by slug).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { slug?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!(await setUserTrack(session.user.id, slug))) {
    return NextResponse.json({ error: "That goal isn't available." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
