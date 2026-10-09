import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, upgradeMessage } from "@/lib/entitlements";
import { getChatScenario } from "@/lib/chat-simulation/scenarios";
import { agentCount, chatView, parseTurns } from "@/lib/chat-simulation/store";
import type { ChatTurn } from "@/lib/chat-simulation/marking";

const bodySchema = z.object({ scenarioKey: z.string().min(1).max(60) });

// Starts a live chat with an AI customer. One chat uses one chat simulation
// from the plan; an unanswered chat the candidate already has open is
// reused instead, so a double click or a refresh never uses up another.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const scenario = parsed.success ? getChatScenario(parsed.data.scenarioKey) : undefined;
  if (!scenario) return NextResponse.json({ error: "That chat couldn't be started. Please try again." }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Chat practice isn't available right now. Please try again later." }, { status: 503 });

  const open = await db.chatSimulation.findFirst({ where: { userId: session.user.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (open && agentCount(parseTurns(open)) === 0) return NextResponse.json({ chat: chatView(open), reused: true });

  const usage = await checkAndRecordUsage(session.user.id, "CHAT_SIMULATION");
  if (!usage.allowed) return NextResponse.json({ error: upgradeMessage(usage, "CHAT_SIMULATION") }, { status: 403 });

  const turns: ChatTurn[] = [{ from: "customer", text: scenario.opening, at: new Date().toISOString() }];
  const chat = await db.chatSimulation.create({ data: { userId: session.user.id, scenarioKey: scenario.key, turnsJson: JSON.stringify(turns) } });
  return NextResponse.json({ chat: chatView(chat), reused: false, remaining: usage.remaining });
}

/** The candidate's chat still in progress (to carry on after a refresh) and their last 10 marked chats. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const [active, done] = await Promise.all([
    db.chatSimulation.findFirst({ where: { userId: session.user.id, status: "ACTIVE", createdAt: { gte: new Date(Date.now() - 86_400_000) } }, orderBy: { createdAt: "desc" } }),
    db.chatSimulation.findMany({ where: { userId: session.user.id, status: "DONE" }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return NextResponse.json({ active: active ? chatView(active) : null, done: done.map(chatView) });
}
