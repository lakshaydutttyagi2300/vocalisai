import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeCoachProfile, describeCoachProfile } from "@/lib/coach-profile";
import { createGeminiCoachProvider, type CoachChatTurn } from "@/lib/providers/gemini-coach-provider";
import { estimateAnalysisCostUsd } from "@/lib/providers/pricing";

const MAX_MESSAGE_LENGTH = 1000;
const HISTORY_TURNS = 10; // bounds prompt size/cost regardless of how long the thread grows

function serialize(m: { id: string; role: string; content: string; createdAt: Date }) {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
}

// Free - just the candidate's own stored chat history.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await db.coachMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages: messages.map(serialize) });
}

// A paid AI turn every call - only fires when the candidate actually sends
// a message, never automatically or on page load.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "The AI coach is not configured on this server." }, { status: 503 });
  }

  const priorMessages = await db.coachMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
  });
  const history: CoachChatTurn[] = priorMessages
    .reverse()
    .map((m) => ({ role: m.role as "user" | "coach", content: m.content }));

  const userMessage = await db.coachMessage.create({
    data: { userId: session.user.id, role: "user", content },
  });

  const profile = await computeCoachProfile(session.user.id);
  const profileDigest = describeCoachProfile(profile);

  const coachProvider = createGeminiCoachProvider(geminiKey);
  let outcome;
  try {
    outcome = await coachProvider.reply(profileDigest, history, content);
  } catch (err) {
    return NextResponse.json(
      {
        error: `The AI coach couldn't respond: ${err instanceof Error ? err.message : "unknown error"}`,
        userMessage: serialize(userMessage),
      },
      { status: 502 }
    );
  }

  const estimatedCostUsd = estimateAnalysisCostUsd(outcome.tokenUsage.textInput, outcome.tokenUsage.output);

  const coachMessage = await db.coachMessage.create({
    data: {
      userId: session.user.id,
      role: "coach",
      content: outcome.reply,
      analysisProvider: outcome.providerName,
      analysisModel: outcome.model,
      estimatedCostUsd,
    },
  });

  return NextResponse.json({ userMessage: serialize(userMessage), coachMessage: serialize(coachMessage) });
}
