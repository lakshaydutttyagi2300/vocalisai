import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { answerPracticeQuestion, PracticeTestError } from "@/lib/practice-tests";
import { masteryAfterAttempt, saveMastery } from "@/lib/skills/mastery-store";

const bodySchema = z.object({
  questionId: z.string().min(1).max(40),
  answer: z.unknown(),
  timeTakenSeconds: z.number().int().min(0).max(4 * 60 * 60),
});

// Saves one answer in the candidate's own practice test.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.answer === undefined || parsed.data.answer === null) {
    return NextResponse.json({ error: "Choose an answer first." }, { status: 400 });
  }

  const userId = session.user.id;
  try {
    const { skillId, firstAnswer, ...result } = await answerPracticeQuestion(userId, (await params).id, parsed.data);
    // Skill mastery (My Skills) for questions from the existing bank; never slows or breaks answering.
    if (firstAnswer && skillId) {
      after(async () => {
        try {
          await saveMastery(userId, await masteryAfterAttempt(userId, skillId));
        } catch (err) {
          console.error("practice test: mastery update failed", err);
        }
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PracticeTestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("practice test: answer failed", err);
    return NextResponse.json({ error: "We couldn't save your answer. Please try again." }, { status: 500 });
  }
}
