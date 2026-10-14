// The support desk: a practice shift with a queue of tickets, each with a due
// time, worked through like a real help-desk shift. Plain functions over the
// shift's tickets, so the page, the API and the tests share them. No imports
// apart from the ticket list: browser code may use this.

import { TICKETS } from "./tickets";

export const SHIFT_SIZE = 5;
/** Minutes from the start of the shift until each ticket is due (shuffled per shift). */
export const DUE_MINUTES = [10, 20, 30, 45, 60] as const;
/** A ticket due within this many minutes counts as "due soon". */
export const DUE_SOON_MINUTES = 15;

export type DeskStatus = "open" | "on_hold" | "resolved";

export interface DeskTicket {
  key: string;
  /** When the customer "sent" it: shortly before the shift, for realism. */
  receivedAt: string;
  dueAt: string;
  status: DeskStatus;
  reviewId?: string;
  resolvedAt?: string;
  score?: number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A new shift's queue: different tickets, staggered due times. */
export function newShiftTickets(now: Date, random: () => number = Math.random, avoid: readonly string[] = []): DeskTicket[] {
  const fresh = TICKETS.filter((t) => !avoid.includes(t.key));
  const pool = fresh.length >= SHIFT_SIZE ? fresh : TICKETS;
  const picked = shuffled(pool, random).slice(0, SHIFT_SIZE);
  const dues = shuffled(DUE_MINUTES, random);
  return picked
    .map((t, i) => ({
      key: t.key,
      receivedAt: new Date(now.getTime() - Math.round(2 + random() * 25) * 60_000).toISOString(),
      dueAt: new Date(now.getTime() + dues[i] * 60_000).toISOString(),
      status: "open" as DeskStatus,
    }))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export const isOverdue = (t: DeskTicket, now: Date) => t.status !== "resolved" && Date.parse(t.dueAt) < now.getTime();
export const isDueSoon = (t: DeskTicket, now: Date) => t.status !== "resolved" && !isOverdue(t, now) && Date.parse(t.dueAt) - now.getTime() <= DUE_SOON_MINUTES * 60_000;
export const resolvedOnTime = (t: DeskTicket) => t.status === "resolved" && !!t.resolvedAt && Date.parse(t.resolvedAt) <= Date.parse(t.dueAt);

/** The dashboard tiles. "Waiting" is every unresolved ticket that isn't on hold. */
export function deskCounts(tickets: readonly DeskTicket[], now: Date) {
  return {
    waiting: tickets.filter((t) => t.status === "open").length,
    dueSoon: tickets.filter((t) => isDueSoon(t, now)).length,
    overdue: tickets.filter((t) => isOverdue(t, now)).length,
    onHold: tickets.filter((t) => t.status === "on_hold").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };
}

/** How the customers would feel, from the marking: 80+ happy, 50-79 neutral, below 50 unhappy. */
export function customerHappiness(scores: readonly number[]) {
  const n = scores.length;
  if (n === 0) return null;
  const pct = (k: number) => Math.round((k / n) * 100);
  const happy = scores.filter((s) => s >= 80).length;
  const unhappy = scores.filter((s) => s < 50).length;
  return {
    responses: n,
    happy: pct(happy),
    neutral: 100 - pct(happy) - pct(unhappy),
    unhappy: pct(unhappy),
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / n),
  };
}

/** "Due in 12 min", "Overdue by 3 min", "Resolved on time" - for the queue. */
export function dueLabel(t: DeskTicket, now: Date): string {
  if (t.status === "resolved") return resolvedOnTime(t) ? "Resolved on time" : "Resolved late";
  const mins = Math.round((Date.parse(t.dueAt) - now.getTime()) / 60_000);
  if (mins < 0) return `Overdue by ${-mins} min`;
  return mins === 0 ? "Due now" : `Due in ${mins} min`;
}
