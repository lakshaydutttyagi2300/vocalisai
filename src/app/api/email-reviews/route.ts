import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, refundUsage, upgradeMessage } from "@/lib/entitlements";
import { countWords, getEmailTask, MAX_REPLY_WORDS, MIN_REPLY_WORDS } from "@/lib/email-writing/tasks";
import { emailScore, emailVerdict, type EmailReviewAi } from "@/lib/email-writing/review";
import { createGeminiEmailReviewProvider } from "@/lib/providers/gemini-email-review-provider";
import { estimateAnalysisCostUsd, GEMINI_FLASH_LITE_3_1, GEMINI_FLASH_LITE_3_5 } from "@/lib/providers/pricing";

const bodySchema = z.object({ taskKey: z.string().min(1).max(60), reply: z.string().max(6000) });

const FAILED = "We couldn't mark your email this time. Your review allowance wasn't used - please try again in a moment.";

function view(r: { id: string; taskKey: string; wordCount: number; score: number; feedbackJson: string; createdAt: Date }) {
  const feedback = JSON.parse(r.feedbackJson) as EmailReviewAi;
  return { id: r.id, taskKey: r.taskKey, wordCount: r.wordCount, score: r.score, verdict: emailVerdict(r.score), ...feedback, createdAt: r.createdAt };
}

// Marks one written reply to a customer email with a single AI call. Paid
// work: counted per user and feature, given back if marking fails.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const task = parsed.success ? getEmailTask(parsed.data.taskKey) : undefined;
  if (!parsed.success || !task) return NextResponse.json({ error: "That email couldn't be sent for marking. Please try again." }, { status: 400 });
  const reply = parsed.data.reply.trim();
  const words = countWords(reply);
  if (words < MIN_REPLY_WORDS) return NextResponse.json({ error: `Write at least ${MIN_REPLY_WORDS} words - a real reply needs a greeting, the solution and a close.` }, { status: 400 });
  if (words > MAX_REPLY_WORDS) return NextResponse.json({ error: `Keep it under ${MAX_REPLY_WORDS} words - customers want short, clear emails.` }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email marking isn't available right now. Please try again later." }, { status: 503 });

  const usage = await checkAndRecordUsage(session.user.id, "EMAIL_REVIEW");
  if (!usage.allowed) return NextResponse.json({ error: upgradeMessage(usage, "EMAIL_REVIEW") }, { status: 403 });

  let outcome;
  try {
    outcome = await createGeminiEmailReviewProvider(apiKey).reviewEmail(task, reply);
  } catch (err) {
    await refundUsage(usage);
    console.error("email review: AI marking failed", { userId: session.user.id, taskKey: task.key, err });
    return NextResponse.json({ error: FAILED }, { status: 502 });
  }

  const pricing = outcome.model === GEMINI_FLASH_LITE_3_5.model ? GEMINI_FLASH_LITE_3_5 : GEMINI_FLASH_LITE_3_1;
  const saved = await db.emailReview.create({
    data: {
      userId: session.user.id,
      taskKey: task.key,
      reply,
      wordCount: words,
      score: emailScore(outcome.result.ratings),
      feedbackJson: JSON.stringify(outcome.result),
      costUsd: estimateAnalysisCostUsd(outcome.tokenUsage.textInput, outcome.tokenUsage.output, 0, pricing),
    },
  });
  return NextResponse.json({ review: view(saved), remaining: usage.remaining });
}

/** The signed-in user's last 10 reviews, newest first. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const rows = await db.emailReview.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 10 });
  return NextResponse.json({ reviews: rows.map(view) });
}
