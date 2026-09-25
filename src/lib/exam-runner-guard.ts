import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isExamRunnerV2Enabled, loadOwnedSession } from "@/lib/exam-runner";

// Shared gate for every /api/exam-sessions route: signed in, the
// exam_runner_v2 flag on (it doubles as a kill switch - turning it off
// stops every v2 route immediately), and the session belongs to the
// caller. Returns either the verified ids or a ready-to-return response.
export async function guardExamSession(
  sessionId: string
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await isExamRunnerV2Enabled())) {
    return { ok: false, response: NextResponse.json({ error: "This exam format isn't available right now." }, { status: 403 }) };
  }
  const owned = await loadOwnedSession(sessionId, session.user.id);
  if (!owned) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true, userId: session.user.id };
}
