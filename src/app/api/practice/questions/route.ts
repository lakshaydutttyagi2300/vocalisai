import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidDifficulty } from "@/lib/practice-taxonomy";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { selectWithCooldown, shuffleArray, RECENT_HISTORY_LIMIT } from "@/lib/question-selection";
import { LEGACY_QUESTION_TYPES } from "@/lib/question-validation";
import { candidateStimulus } from "@/lib/question-stimulus";

// Returns a random set of questions for a category/difficulty. The correct
// answer is never included here - it's only checked server-side when the
// candidate submits an attempt, so it can't be read out of the network tab.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const count = Math.min(Number(searchParams.get("count") ?? "5"), 10);

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (!difficulty || !isValidDifficulty(difficulty)) {
    return NextResponse.json({ error: "Invalid or missing difficulty" }, { status: 400 });
  }

  if (!(await isFeatureEnabled(category))) {
    return NextResponse.json({ error: "This practice category is currently unavailable." }, { status: 403 });
  }

  const pool = await db.practiceQuestion.findMany({
    // Only the 4 original types - the only ones this route's callers
    // (solo practice, the v1 mock-test runner) can render. Newer types
    // (P1-C/G) are served exclusively by exam runner v2. Every question
    // that existed before P1-G is one of these 4, so this changes nothing
    // for existing data.
    where: { category, difficulty, isActive: true, type: { in: LEGACY_QUESTION_TYPES } },
    select: {
      id: true,
      category: true,
      difficulty: true,
      type: true,
      prompt: true,
      passage: true,
      options: true,
      timeLimitSeconds: true,
      source: true,
    },
  });

  if (pool.length === 0) {
    return NextResponse.json({ error: "No questions available for this selection yet." }, { status: 404 });
  }

  // Most-recently-answered-first, so selectWithCooldown excludes the
  // freshest repeats first when the pool is too small to avoid all of them.
  const recentAttempts = await db.practiceAttempt.findMany({
    where: { userId: session.user.id, category, difficulty },
    orderBy: { createdAt: "desc" },
    take: RECENT_HISTORY_LIMIT,
    select: { questionId: true },
  });
  const recentlySeenIds = [...new Set(recentAttempts.map((a) => a.questionId))];

  const picked = selectWithCooldown(pool, recentlySeenIds, count);
  // Shuffled fresh on every fetch (i.e. every new attempt) - the client
  // stores whatever order it receives here in local state for the rest of
  // that session, so this is also what keeps a single attempt's option
  // order fixed once it's started.
  // `passage` goes through the shared stimulus parser: raw production
  // specs (audio scripts, image briefs) and listening transcripts never
  // reach the browser as displayable text - see src/lib/question-stimulus.ts.
  const selected = picked.map((q) => ({
    ...q,
    ...candidateStimulus(q.passage, q),
    options: q.options ? shuffleArray(JSON.parse(q.options)) : null,
  }));

  return NextResponse.json({ questions: selected });
}
