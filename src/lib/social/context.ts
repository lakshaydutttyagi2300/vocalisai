// Builds the real (production) context: Postgres store, free Gemini, official
// platform APIs. Tests build their own context with fakes instead.

import { geminiClient } from "./ai";
import { loadConfig } from "./config";
import { renderCard } from "./card";
import { notifyOwner, publishersFor } from "./platforms";
import { PrismaSocialStore } from "./prisma-store";
import { loadAudienceSignals } from "./signals";
import type { Ctx } from "./agents/core";

export async function buildContext(): Promise<Ctx> {
  const store = new PrismaSocialStore();
  const config = await loadConfig(store);
  return {
    store, config, ai: geminiClient(store, config), now: () => new Date(), fetch,
    publishers: publishersFor(), renderCard, signals: () => loadAudienceSignals(), rng: Math.random, notify: (t) => notifyOwner(t),
  };
}
