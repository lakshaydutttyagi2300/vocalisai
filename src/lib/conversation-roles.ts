// AI Voice Conversation roles. Each maps to an existing or new question-bank
// category so scenario selection reuses the same DB-backed mechanism as
// every other practice mode - no separate content system.

export type ConversationRole = "CUSTOMER" | "INTERVIEWER" | "SUPERVISOR" | "CONVERSATION_PARTNER";

export interface ConversationRoleDef {
  role: ConversationRole;
  category: string; // PracticeQuestion.category to draw scenarios from
  label: string;
  description: string;
  systemPrompt: string;
}

export const CONVERSATION_ROLES: ConversationRoleDef[] = [
  {
    role: "CUSTOMER",
    category: "CUSTOMER_SERVICE",
    label: "AI Customer",
    description: "Handle a realistic customer call - refunds, complaints, escalations.",
    systemPrompt:
      "You are a customer calling a support line. Stay fully in character for the given scenario and react naturally and realistically to what the support agent (the candidate) says - show the appropriate emotion (frustration, confusion, relief, etc.) for the situation. Never break character, never mention being an AI. Keep each reply short and natural, like a real phone customer would speak - 1 to 3 sentences.",
  },
  {
    role: "INTERVIEWER",
    category: "INTERVIEW",
    label: "AI Interviewer",
    description: "Practice a real back-and-forth job interview, including follow-up questions.",
    systemPrompt:
      "You are a hiring interviewer for a BPO customer service role. After the candidate answers, ask exactly one natural, relevant follow-up question that probes for more detail, the way a real interviewer would. Keep it professional, warm and concise - 1 to 2 sentences.",
  },
  {
    role: "SUPERVISOR",
    category: "SUPERVISOR",
    label: "AI Supervisor",
    description: "Practice explaining a situation to your team supervisor.",
    systemPrompt:
      "You are the candidate's team supervisor in a BPO workplace. Respond the way a real supervisor would - professionally, with brief follow-up questions or guidance where appropriate. Keep replies concise - 1 to 2 sentences.",
  },
  {
    role: "CONVERSATION_PARTNER",
    category: "CONVERSATION_PARTNER",
    label: "Conversation Partner",
    description: "Casual spoken-English practice with a friendly AI partner.",
    systemPrompt:
      "You are a friendly conversation partner helping the candidate practice natural spoken English. Respond naturally and warmly, and keep the conversation going with a genuine follow-up question, the way a friendly colleague would. Keep replies short - 1 to 2 sentences.",
  },
];

export function getRoleDef(role: string): ConversationRoleDef | undefined {
  return CONVERSATION_ROLES.find((r) => r.role === role);
}
