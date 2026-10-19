import type { AgentDef, Handler } from "./agents/core";
import { audienceAgent, trendAgent } from "./agents/research";
import { creativeAgent, mediaAgent, strategistAgent, writerAgent } from "./agents/content";
import { factcheckerAgent, qaAgent } from "./agents/review";
import { analyticsAgent, communityAgent, publisherAgent } from "./agents/publishing";
import { growthAgent, opsAgent, reportingAgent } from "./agents/improve";

export const AGENTS: AgentDef[] = [
  trendAgent, audienceAgent, strategistAgent, writerAgent, factcheckerAgent, creativeAgent, mediaAgent, qaAgent,
  publisherAgent, communityAgent, analyticsAgent, growthAgent, opsAgent, reportingAgent,
];

export const HANDLERS: Record<string, { agent: AgentDef; run: Handler }> = Object.fromEntries(
  AGENTS.flatMap((a) => Object.entries(a.handlers).map(([kind, run]) => [kind, { agent: a, run }])),
);
export const PUBLIC_KINDS = Object.keys(HANDLERS).filter((k) => HANDLERS[k].agent.publicAction);

/** What the Orchestrator, Memory service and not-built agents are, shown in the panel and docs. */
export const NOT_TASK_AGENTS = [
  { id: "orchestrator", name: "Orchestrator", responsibility: "src/lib/social/orchestrator.ts: seeds scheduled work, claims tasks, runs independent ones in parallel, enforces timeouts, retries with back-off, recovers crashed tasks, blocks public actions during Emergency stop and caps task chains." },
  { id: "memory", name: "Memory & Knowledge", responsibility: "src/lib/social/memory.ts: the shared record (notes, posts, metrics). Decides what research is fresh, what topics were covered, and redacts credentials before anything is stored." },
];
export const FOLDED_AGENTS = [
  { name: "Competitor Intelligence / Social Listening", note: "Not separate agents: public news and trend feeds are read by the Trend Research agent. Reading competitor accounts or mass-commenting is deliberately not built." },
  { name: "Conversion & Funnel", note: "Tracked links (/go/<post>) count clicks per post; sign-up attribution is a later step." },
  { name: "Community Support & Reputation", note: "Covered by the Community Management agent's escalation of complaints and sensitive comments." },
];
