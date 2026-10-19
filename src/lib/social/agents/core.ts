// Contracts shared by every agent. An agent is a set of task handlers plus the
// description the control panel shows. Handlers return structured results and
// the follow-up tasks they want; they never call each other directly.

import type { AiClient } from "../ai";
import type { SocialConfig } from "../config";
import type { Publisher } from "../platforms";
import type { AudienceSignals } from "../signals";
import type { SocialStore } from "../store";
import type { NewTask, Task } from "../types";

export interface Ctx {
  store: SocialStore;
  config: SocialConfig;
  ai: AiClient;
  now: () => Date;
  fetch: typeof fetch;
  publishers: Partial<Record<import("../types").Platform, Publisher>>;
  renderCard: (i: { text: string; style: string }) => Promise<Buffer>;
  signals: () => Promise<AudienceSignals>;
  rng: () => number;
  notify: (text: string) => Promise<boolean>;
}

export interface HandlerResult { result: Record<string, unknown>; next?: NewTask[] }
export type Handler = (task: Task, ctx: Ctx) => Promise<HandlerResult>;

export interface AgentDef {
  id: string;
  name: string;
  responsibility: string;
  inputs: string[];
  outputs: string[];
  tools: string[]; // what it is allowed to touch
  usesAi: boolean;
  failureConditions: string[];
  /** true = its tasks act in public (posting) and are stopped by Emergency stop. */
  publicAction?: boolean;
  handlers: Record<string, Handler>;
}

export const MAX_REVISIONS = 2;
export const MAX_DEPTH = 10; // a chain longer than this is a loop, not work

export function child(task: Task, t: Omit<NewTask, "parentId" | "depth">): NewTask {
  return { ...t, parentId: task.id, depth: task.depth + 1 };
}

export const todayKey = (now: Date) => now.toISOString().slice(0, 10);
export function istParts(d: Date) {
  const ist = new Date(d.getTime() + 330 * 60_000);
  return { date: ist.toISOString().slice(0, 10), hour: ist.getUTCHours(), dow: ist.getUTCDay() };
}
/** UTC instant of a given India-time date and "HH:MM". */
export function istInstant(date: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${date}T00:00:00Z`) + (h * 60 + m - 330) * 60_000);
}
