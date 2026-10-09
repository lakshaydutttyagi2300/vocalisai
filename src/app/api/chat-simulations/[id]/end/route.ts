import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChatScenario } from "@/lib/chat-simulation/scenarios";
import { averageReplySeconds, chatScore } from "@/lib/chat-simulation/marking";
import { agentCount, aiCostUsd, chatView, ownedChat, parseTurns } from "@/lib/chat-simulation/store";
import { createGeminiChatProvider } from "@/lib/providers/gemini-chat-provider";

// Ends the chat and marks it with one AI call. Asking again returns the same
// result instead of marking (and paying) twice.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const chat = await ownedChat((await params).id, session.user.id);
  const scenario = chat ? getChatScenario(chat.scenarioKey) : undefined;
  if (!chat || !scenario) return NextResponse.json({ error: "That chat wasn't found." }, { status: 404 });
  if (chat.status === "DONE") return NextResponse.json({ chat: chatView(chat) });

  const turns = parseTurns(chat);
  if (agentCount(turns) === 0) return NextResponse.json({ error: "Reply to the customer at least once before ending the chat." }, { status: 400 });

  let marking;
  try {
    marking = await createGeminiChatProvider(process.env.GEMINI_API_KEY ?? "").markChat(scenario, turns);
  } catch (err) {
    console.error("chat simulation: marking failed", { chatId: chat.id, err });
    return NextResponse.json({ error: "We couldn't mark your chat this time. Please try again in a moment - your chat is saved." }, { status: 502 });
  }

  const data = {
    status: "DONE",
    score: chatScore(marking.result.ratings),
    replySeconds: averageReplySeconds(turns),
    feedbackJson: JSON.stringify(marking.result),
    costUsd: chat.costUsd + aiCostUsd(marking.tokens, marking.model),
    endedAt: new Date(),
  };
  const saved = await db.chatSimulation.updateMany({ where: { id: chat.id, status: "ACTIVE" }, data });
  const final = saved.count ? { ...chat, ...data } : await db.chatSimulation.findUniqueOrThrow({ where: { id: chat.id } });
  return NextResponse.json({ chat: chatView(final) });
}
