import { describe, expect, it } from "vitest";
import { customerHappiness, deskCounts, dueLabel, newShiftTickets, resolvedOnTime, SHIFT_SIZE, DUE_MINUTES, type DeskTicket } from "@/lib/ticket-handling/desk";
import { TICKETS } from "@/lib/ticket-handling/tickets";

const NOW = new Date("2026-10-14T10:00:00Z");
const at = (min: number) => new Date(NOW.getTime() + min * 60_000).toISOString();
let seed = 1;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe("support desk shifts", () => {
  it("fill a queue with different tickets and staggered due times, soonest first", () => {
    const tickets = newShiftTickets(NOW, random);
    expect(tickets).toHaveLength(SHIFT_SIZE);
    expect(new Set(tickets.map((t) => t.key)).size).toBe(SHIFT_SIZE);
    expect(tickets.map((t) => (Date.parse(t.dueAt) - NOW.getTime()) / 60_000)).toEqual([...DUE_MINUTES]);
    for (const t of tickets) {
      expect(t.status).toBe("open");
      expect(Date.parse(t.receivedAt)).toBeLessThan(NOW.getTime());
      expect(TICKETS.some((x) => x.key === t.key)).toBe(true);
    }
  });

  it("avoid the previous shift's tickets while enough others are left", () => {
    const first = newShiftTickets(NOW, random).map((t) => t.key);
    const second = newShiftTickets(NOW, random, first).map((t) => t.key);
    if (TICKETS.length - first.length >= SHIFT_SIZE) expect(second.some((k) => first.includes(k))).toBe(false);
    expect(second).toHaveLength(SHIFT_SIZE);
  });

  it("count the dashboard tiles", () => {
    const q: DeskTicket[] = [
      { key: "a", receivedAt: at(-20), dueAt: at(-5), status: "open" }, // overdue
      { key: "b", receivedAt: at(-20), dueAt: at(10), status: "open" }, // due soon
      { key: "c", receivedAt: at(-20), dueAt: at(50), status: "on_hold" },
      { key: "d", receivedAt: at(-20), dueAt: at(30), status: "resolved", resolvedAt: at(-1), score: 85 },
    ];
    expect(deskCounts(q, NOW)).toEqual({ waiting: 2, dueSoon: 1, overdue: 1, onHold: 1, resolved: 1 });
    expect(dueLabel(q[0], NOW)).toBe("Overdue by 5 min");
    expect(dueLabel(q[1], NOW)).toBe("Due in 10 min");
    expect(dueLabel(q[3], NOW)).toBe("Resolved on time");
    expect(resolvedOnTime({ ...q[3], resolvedAt: at(31) })).toBe(false);
  });

  it("turn ticket scores into customer happiness", () => {
    expect(customerHappiness([])).toBeNull();
    expect(customerHappiness([90, 85, 60, 30])).toEqual({ responses: 4, happy: 50, neutral: 25, unhappy: 25, averageScore: 66 });
    const h = customerHappiness([80, 79, 49])!;
    expect(h.happy + h.neutral + h.unhappy).toBe(100);
  });
});
