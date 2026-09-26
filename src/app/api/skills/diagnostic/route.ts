import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAndRecordUsage, upgradeMessage } from "@/lib/entitlements";
import { issueDrillToken } from "@/lib/skills/drill-token";
import { displayName } from "@/lib/skills/taxonomy";
import { findVisibleSkill, pickDiagnostic, skillNames, VOICE_CATEGORY_PRACTICE } from "@/lib/skills/drills";

// "I'm weak in X": a short diagnostic across one category's subcategories
// (its blueprint: 2 questions each at L2-L4). Speaking-type categories have
// no instant marking, so they're pointed at their practice modes instead.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = (new URL(req.url).searchParams.get("category") ?? "").toUpperCase();
  const category = await findVisibleSkill(code);
  if (!category || category.depth !== 1) {
    return NextResponse.json({ error: "That category isn't available." }, { status: 404 });
  }

  if (VOICE_CATEGORY_PRACTICE[code]) {
    return NextResponse.json({ kind: "voice", category: { id: code, name: displayName(category) }, practice: VOICE_CATEGORY_PRACTICE[code] });
  }

  const questions = await pickDiagnostic(session.user.id, code);
  if (questions.length === 0) {
    return NextResponse.json({ error: "There are no diagnostic questions for this category on your plan yet." }, { status: 404 });
  }

  const usage = await checkAndRecordUsage(session.user.id, "PRACTICE_SESSION");
  if (!usage.allowed) {
    return NextResponse.json({ error: upgradeMessage(usage, "PRACTICE_SESSION") }, { status: 403 });
  }

  return NextResponse.json({
    kind: "diagnostic",
    category: { id: code, name: displayName(category) },
    names: await skillNames(questions.map((q) => q.skillId).filter((id): id is string => !!id)),
    questions,
    drillToken: issueDrillToken(session.user.id, questions.map((q) => q.id)),
  });
}
