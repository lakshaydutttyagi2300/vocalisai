import { z } from "zod";
import type { SocialStore } from "./store";
import type { Mode, Platform } from "./types";

export const PLATFORMS: Platform[] = ["telegram", "bluesky", "linkedin", "x", "instagram", "youtube"];
// Platforms we can publish to ourselves through a free official API.
// The rest get a ready-to-post package and are published by hand.
export const AUTO_PLATFORMS: Platform[] = ["telegram", "bluesky", "linkedin"];

export const configSchema = z.object({
  mode: z.enum(["draft", "supervised", "autopilot"]).default("draft"),
  platforms: z.array(z.enum(["telegram", "bluesky", "linkedin", "x", "instagram", "youtube"])).default(["bluesky", "telegram"]),
  postsPerDay: z.number().int().min(0).max(6).default(2),
  planDaysAhead: z.number().int().min(1).max(7).default(2),
  // Posting slots in India time (24h "HH:MM").
  slotsIst: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(["08:30", "13:00", "19:30"]),
  maxAiCallsPerDay: z.number().int().min(0).max(500).default(40), // free Gemini quota guard
  concurrency: z.number().int().min(1).max(5).default(3),
  taskTimeoutMs: z.number().int().min(5_000).max(120_000).default(40_000),
  tickBudgetMs: z.number().int().min(10_000).max(55_000).default(45_000),
  maxTasksPerTick: z.number().int().min(1).max(100).default(30),
  siteUrl: z.string().url().default("https://vocalisai.vercel.app"),
  niche: z.string().default("English speaking, workplace communication and job-interview preparation for Indian job seekers"),
});
export type SocialConfig = z.infer<typeof configSchema>;

export async function loadConfig(store: SocialStore): Promise<SocialConfig> {
  const raw = await store.getSetting("config");
  try { return configSchema.parse(raw ? JSON.parse(raw) : {}); } catch { return configSchema.parse({}); }
}
export async function saveConfig(store: SocialStore, patch: Partial<SocialConfig>): Promise<SocialConfig> {
  const next = configSchema.parse({ ...(await loadConfig(store)), ...patch });
  await store.setSetting("config", JSON.stringify(next));
  return next;
}

// Emergency stop is its own setting so no config bug can hide it. Checked by
// the publisher and the reply sender immediately before any public action.
export async function isStopped(store: SocialStore): Promise<boolean> { return (await store.getSetting("stop")) === "1"; }
export async function setStopped(store: SocialStore, on: boolean) { await store.setSetting("stop", on ? "1" : "0"); }

export function canPublish(mode: Mode): boolean { return mode !== "draft"; }

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
