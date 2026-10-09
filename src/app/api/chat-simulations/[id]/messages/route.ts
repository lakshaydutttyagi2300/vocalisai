import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChatScenario, MAX_AGENT_MESSAGES, MAX_MESSAGE_CHARS } from "@/lib/chat-simulation/scenarios";
import { agentCount, aiCostUsd, chatView, ownedChat, parseTurns } from "@/lib/chat-simulation/store";
import type { ChatTurn } from "@/lib/chat-simulation/marking";
import { createGeminiChatProvider } from "@/lib/providers/gemini-chat-provider";

const bodySchema = z.object({ text: z.string().max(MAX_MESSAGE_CHARS * 2) });

// The candidate sends one chat message; the AI customer answers. If the AI
// fails, nothing is saved, so sending again just works.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const chat = await ownedChat((await params).id, session.user.id);
  const scenario = chat ? getChatScenario(chat.scenarioKey) : undefined;
  if (!chat || !scenario) return NextResponse.json({ error: "That chat wasn't found." }, { status: 404 });
  if (chat.status !== "ACTIVE") return NextResponse.json({ error: "This chat has ended." }, { status: 409 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const text = parsed.success ? parsed.data.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  if (text.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: `Keep each message under ${MAX_MESSAGE_CHARS} characters - chat customers want short replies.` }, { status: 400 });

  const turns = parseTurns(chat);
  if (chatView(chat).finished) return NextResponse.json({ error: "This chat is complete. End it to get your score." }, { status: 409 });
  if (turns[turns.length - 1]?.from !== "customer") return NextResponse.json({ error: "Please wait for the customer's reply." }, { status: 409 });

  const next: ChatTurn[] = [...turns, { from: "agent", text, at: new Date().toISOString() }];
  // After the customer is satisfied, the agent's message is the closing: no reply needed.
  const closing = turns.some((t) => t.from === "customer" && t.satisfied);
  let cost = 0;
  if (!closing && agentCount(next) < MAX_AGENT_MESSAGES) {
    try {
      const reply = await createGeminiChatProvider(process.env.GEMINI_API_KEY ?? "").customerReply(scenario, next);
      next.push({ from: "customer", text: reply.message, at: new Date().toISOString(), satisfied: reply.satisfied });
      cost = aiCostUsd(reply.tokens, reply.model);
    } catch (err) {
      console.error("chat simulation: customer reply failed", { chatId: chat.id, err });
      return NextResponse.json({ error: "The customer didn't get your message. Please send it again." }, { status: 502 });
    }
  }

  // Only if nothing changed the chat meanwhile (e.g. a double send).
  const saved = await db.chatSimulation.updateMany({
    where: { id: chat.id, turnsJson: chat.turnsJson, status: "ACTIVE" },
    data: { turnsJson: JSON.stringify(next), costUsd: { increment: cost } },
  });
  if (saved.count === 0) return NextResponse.json({ error: "Please wait for the customer's reply." }, { status: 409 });
  return NextResponse.json({ chat: chatView({ ...chat, turnsJson: JSON.stringify(next) }) });
}
