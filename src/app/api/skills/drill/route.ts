import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAndRecordUsage, upgradeMessage } from "@/lib/entitlements";
import { issueDrillToken } from "@/lib/skills/drill-token";
import { displayName } from "@/lib/skills/taxonomy";
import { DRILL_DEFAULT, DRILL_MAX, DRILL_MIN, findVisibleSkill, pickDrill, skillNames } from "@/lib/skills/drills";

// Starts a Quick Drill on one skill node: 5-10 instantly-marked questions
// aimed just above the candidate's current level. Charged as ONE practice
// session here; the answers (through /api/practice/attempts, carrying the
// returned drillToken) are not charged again.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const skillId = searchParams.get("skill") ?? "";
  const requested = Number(searchParams.get("count") ?? DRILL_DEFAULT);
  const count = Math.min(DRILL_MAX, Math.max(DRILL_MIN, Number.isFinite(requested) ? Math.round(requested) : DRILL_DEFAULT));

  const skill = await findVisibleSkill(skillId);
  if (!skill) {
    return NextResponse.json({ error: "That skill isn't available." }, { status: 404 });
  }

  const questions = await pickDrill(session.user.id, skill.id, count);
  if (questions.length === 0) {
    return NextResponse.json({ error: "There are no drill questions for this skill on your plan yet." }, { status: 404 });
  }

  const usage = await checkAndRecordUsage(session.user.id, "PRACTICE_SESSION");
  if (!usage.allowed) {
    return NextResponse.json({ error: upgradeMessage(usage, "PRACTICE_SESSION") }, { status: 403 });
  }

  return NextResponse.json({
    kind: "drill",
    skill: { id: skill.id, name: displayName(skill), categoryCode: skill.categoryCode },
    names: await skillNames(questions.map((q) => q.skillId).filter((id): id is string => !!id)),
    questions,
    drillToken: issueDrillToken(session.user.id, questions.map((q) => q.id)),
  });
}
