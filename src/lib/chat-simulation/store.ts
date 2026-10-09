// Loading, saving and showing chat simulations. Server only.

import type { ChatSimulation } from "@prisma/client";
import { db } from "@/lib/db";
import { estimateAnalysisCostUsd, GEMINI_FLASH_LITE_3_1, GEMINI_FLASH_LITE_3_5 } from "@/lib/providers/pricing";
import { chatVerdict, type ChatMarking, type ChatTurn } from "./marking";
import { MAX_AGENT_MESSAGES } from "./scenarios";

export function parseTurns(chat: Pick<ChatSimulation, "turnsJson">): ChatTurn[] {
  return JSON.parse(chat.turnsJson) as ChatTurn[];
}

export const agentCount = (turns: readonly ChatTurn[]) => turns.filter((t) => t.from === "agent").length;

/** The candidate's own chat, or null (also for someone else's - never reveal it exists). */
export async function ownedChat(id: string, userId: string): Promise<ChatSimulation | null> {
  const chat = await db.chatSimulation.findUnique({ where: { id } });
  return chat && chat.userId === userId ? chat : null;
}

export function aiCostUsd(tokens: { input: number; output: number }, model: string): number {
  return estimateAnalysisCostUsd(tokens.input, tokens.output, 0, model === GEMINI_FLASH_LITE_3_5.model ? GEMINI_FLASH_LITE_3_5 : GEMINI_FLASH_LITE_3_1);
}

/** What the candidate's browser gets: never the AI customer's private brief or costs. */
export function chatView(chat: ChatSimulation) {
  const turns = parseTurns(chat);
  const last = turns[turns.length - 1];
  const feedback = chat.feedbackJson ? (JSON.parse(chat.feedbackJson) as ChatMarking) : null;
  return {
    id: chat.id,
    scenarioKey: chat.scenarioKey,
    status: chat.status as "ACTIVE" | "DONE",
    turns: turns.map((t) => ({ from: t.from, text: t.text, at: t.at })),
    canEnd: agentCount(turns) > 0,
    /** The customer is happy (the agent can still send one closing message). */
    customerSatisfied: turns.some((t) => t.from === "customer" && t.satisfied),
    /** No more replies: the agent has closed after the customer was satisfied, or used every message. */
    finished: last?.from === "agent" && (agentCount(turns) >= MAX_AGENT_MESSAGES || turns.some((t) => t.from === "customer" && t.satisfied)),
    agentMessagesLeft: Math.max(0, MAX_AGENT_MESSAGES - agentCount(turns)),
    score: chat.score,
    replySeconds: chat.replySeconds,
    verdict: chat.score === null ? null : chatVerdict(chat.score, chat.replySeconds),
    feedback,
    createdAt: chat.createdAt,
  };
}
export type ChatView = ReturnType<typeof chatView>;
