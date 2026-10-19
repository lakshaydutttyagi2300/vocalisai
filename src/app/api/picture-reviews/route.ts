import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, refundUsage, upgradeMessage } from "@/lib/entitlements";
import { countWords, getPicturePrompt, MAX_PICTURE_WORDS, MIN_PICTURE_WORDS } from "@/lib/picture-writing/prompts";
import { PICTURE_SCENES } from "@/lib/picture-writing/scenes";
import { pictureScore, pictureVerdict, type PictureReviewAi } from "@/lib/picture-writing/review";
import { createGeminiPictureReviewProvider } from "@/lib/providers/gemini-picture-review-provider";
import { estimateAnalysisCostUsd, GEMINI_FLASH_LITE_3_1, GEMINI_FLASH_LITE_3_5 } from "@/lib/providers/pricing";

const bodySchema = z.object({
  promptKey: z.string().min(1).max(60),
  attemptKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  response: z.string().max(6000),
  timedOut: z.boolean().default(false),
});

const FAILED = "We couldn't mark your description this time. Your review allowance wasn't used - please try again in a moment.";

type Row = { id: string; promptKey: string; response: string; wordCount: number; timedOut: boolean; score: number; feedbackJson: string; createdAt: Date };
function view(r: Row) {
  const feedback = JSON.parse(r.feedbackJson) as PictureReviewAi;
  return { id: r.id, promptKey: r.promptKey, response: r.response, wordCount: r.wordCount, timedOut: r.timedOut, score: r.score, verdict: pictureVerdict(r.score), ...feedback, createdAt: r.createdAt };
}

// Marks one timed description of a workplace photo with a single AI call.
// Paid work: counted per user and feature, given back if marking fails. The
// same attempt sent twice (a click as the timer runs out) is marked once.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const prompt = parsed.success ? getPicturePrompt(parsed.data.promptKey) : undefined;
  const scene = prompt ? PICTURE_SCENES[prompt.key] : undefined;
  if (!parsed.success || !prompt || !scene) return NextResponse.json({ error: "Your description couldn't be sent for marking. Please try again." }, { status: 400 });
  const { attemptKey, timedOut } = parsed.data;

  const earlier = await db.pictureReview.findUnique({ where: { userId_attemptKey: { userId, attemptKey } } });
  if (earlier) return NextResponse.json({ review: view(earlier), remaining: null });

  const response = parsed.data.response.trim();
  const words = countWords(response);
  if (words < MIN_PICTURE_WORDS) return NextResponse.json({ error: `Write at least ${MIN_PICTURE_WORDS} words so there is enough to mark: who is there, what is happening and what might happen next.` }, { status: 400 });
  if (words > MAX_PICTURE_WORDS) return NextResponse.json({ error: `Keep it under ${MAX_PICTURE_WORDS} words.` }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Picture-writing marking isn't available right now. Please try again later." }, { status: 503 });

  const usage = await checkAndRecordUsage(userId, "PICTURE_REVIEW");
  if (!usage.allowed) return NextResponse.json({ error: upgradeMessage(usage, "PICTURE_REVIEW") }, { status: 403 });

  let outcome;
  try {
    outcome = await createGeminiPictureReviewProvider(apiKey).reviewPicture(scene, response, timedOut);
  } catch (err) {
    await refundUsage(usage);
    console.error("picture review: AI marking failed", { userId, promptKey: prompt.key, err });
    return NextResponse.json({ error: FAILED }, { status: 502 });
  }

  const pricing = outcome.model === GEMINI_FLASH_LITE_3_5.model ? GEMINI_FLASH_LITE_3_5 : GEMINI_FLASH_LITE_3_1;
  try {
    const saved = await db.pictureReview.create({
      data: {
        userId,
        promptKey: prompt.key,
        attemptKey,
        response,
        wordCount: words,
        timedOut,
        score: pictureScore(outcome.result.ratings),
        feedbackJson: JSON.stringify(outcome.result),
        costUsd: estimateAnalysisCostUsd(outcome.tokenUsage.textInput, outcome.tokenUsage.output, 0, pricing),
      },
    });
    return NextResponse.json({ review: view(saved), remaining: usage.remaining });
  } catch (err) {
    // The same attempt was saved by a request that arrived at the same moment: keep that one, give this allowance back.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await refundUsage(usage);
      const first = await db.pictureReview.findUnique({ where: { userId_attemptKey: { userId, attemptKey } } });
      if (first) return NextResponse.json({ review: view(first), remaining: null });
    }
    throw err;
  }
}

/** The signed-in user's last 10 picture descriptions, newest first. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const rows = await db.pictureReview.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 10 });
  return NextResponse.json({ reviews: rows.map(view) });
}
