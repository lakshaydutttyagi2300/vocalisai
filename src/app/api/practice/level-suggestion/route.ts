import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DIFFICULTIES, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { checkDifficultyAccess } from "@/lib/entitlements";
import { suggestLevel } from "@/lib/level-suggestion";

const querySchema = z.object({
  category: z.enum(PRACTICE_MODES.map((m) => m.category) as [string, ...string[]]),
  difficulty: z.enum(DIFFICULTIES),
});

// Whether the signed-in candidate's recent marked answers in one category
// and level suggest moving up or down a level (src/lib/level-suggestion.ts).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ category: searchParams.get("category"), difficulty: searchParams.get("difficulty") });
  if (!parsed.success) return NextResponse.json({ error: "Choose a practice area and level." }, { status: 400 });
  const { category, difficulty } = parsed.data;

  const answers = await db.practiceAttempt.findMany({
    where: { userId: session.user.id, category, difficulty, mockTestSessionId: null, isCorrect: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { createdAt: true, isCorrect: true },
  });
  const suggestion = suggestLevel(
    difficulty,
    answers.map((a) => ({ createdAt: a.createdAt, value: a.isCorrect ? 1 : 0 }))
  );
  if (!suggestion) return NextResponse.json({ suggestion: null });

  // Moving up to a level the plan doesn't include: say so rather than offer a button that fails.
  const allowed = await checkDifficultyAccess(session.user.id, suggestion.to);
  return NextResponse.json({ suggestion: { ...suggestion, allowed } });
}
