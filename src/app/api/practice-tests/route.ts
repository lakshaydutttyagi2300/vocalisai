import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { DIFFICULTIES } from "@/lib/practice-taxonomy";
import { TEST_MODES } from "@/lib/practice-bank";
import { PracticeTestError, startPracticeTest } from "@/lib/practice-tests";

const bodySchema = z.object({
  examId: z.string().min(1).max(40).nullish(),
  subjectId: z.string().min(1).max(40).nullish(),
  skillId: z.string().min(1).max(40).nullish(),
  difficulty: z.enum(DIFFICULTIES),
  mode: z.enum(TEST_MODES),
  timed: z.boolean().default(false),
  count: z.number().int().min(5).max(50).default(10),
});

// Starts a catalogue practice test (docs/CATALOGUE.md) for the signed-in candidate.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an exam, subject, level and mode to start." }, { status: 400 });

  try {
    const testId = await startPracticeTest(session.user.id, parsed.data);
    return NextResponse.json({ testId });
  } catch (err) {
    if (err instanceof PracticeTestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("practice test: start failed", err);
    return NextResponse.json({ error: "We couldn't start your test. Please try again." }, { status: 500 });
  }
}
