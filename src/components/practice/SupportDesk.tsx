"use client";

import { useCallback, useEffect, useState } from "react";
import { AlarmClock, CheckCircle2, CircleAlert, Hourglass, Inbox, Mail, MessageSquare, PauseCircle, PlayCircle, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { TicketHandling } from "@/components/practice/TicketHandling";
import { TICKETS } from "@/lib/ticket-handling/tickets";
import { customerHappiness, deskCounts, dueLabel, isDueSoon, isOverdue, resolvedOnTime, SHIFT_SIZE, type DeskTicket } from "@/lib/ticket-handling/desk";

interface Shift {
  id: string;
  tickets: DeskTicket[];
  startedAt: string;
}

const CHANNEL_ICON: Record<string, LucideIcon> = { Email: Mail, "Web form": MessageSquare, App: Smartphone };
const ticketOf = (key: string) => TICKETS.find((t) => t.key === key);

async function call(url: string, body?: unknown) {
  const res = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function SupportDesk() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [recentScores, setRecentScores] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const data = await call("/api/desk-shifts");
      setShift(data.shift);
      setRecentScores(data.recentScores);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your desk couldn't be loaded. Please refresh the page.");
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  // The due times count down live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function startShift() {
    setBusy(true);
    setError(null);
    try {
      setShift((await call("/api/desk-shifts", {})).shift);
      setNow(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your shift couldn't be started. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setHold(key: string, action: "hold" | "resume") {
    if (!shift) return;
    setError(null);
    try {
      const data = await call(`/api/desk-shifts/${shift.id}/tickets/${key}`, { action });
      setShift({ ...shift, tickets: data.tickets });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That change couldn't be made. Please try again.");
    }
  }

  if (!loaded) return <p className="text-sm text-slate-600">Loading your desk...</p>;

  if (working && shift) {
    return (
      <TicketHandling
        ticketKey={working}
        shiftId={shift.id}
        onBack={() => {
          setWorking(null);
          void load();
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const happiness = customerHappiness(recentScores);
  const counts = shift ? deskCounts(shift.tickets, now) : null;
  const done = shift ? shift.tickets.filter((t) => t.status === "resolved") : [];
  const onTime = done.length ? Math.round((done.filter(resolvedOnTime).length / done.length) * 100) : null;
  const tiles: { label: string; value: number; icon: LucideIcon; tone: string }[] = counts
    ? [
        { label: "Waiting", value: counts.waiting, icon: Inbox, tone: "text-brand-700 bg-brand-50" },
        { label: "Due soon", value: counts.dueSoon, icon: Hourglass, tone: "text-amber-700 bg-amber-50" },
        { label: "Overdue", value: counts.overdue, icon: CircleAlert, tone: "text-red-700 bg-red-50" },
        { label: "On hold", value: counts.onHold, icon: PauseCircle, tone: "text-slate-700 bg-slate-100" },
        { label: "Resolved", value: counts.resolved, icon: CheckCircle2, tone: "text-green-700 bg-green-50" },
      ]
    : [];

  return (
    <div className="grid gap-6">
      {!shift ? (
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink-950">Start a practice shift</h2>
          <p className="mt-2 text-sm text-slate-600">
            You get a queue of {SHIFT_SIZE} customer tickets, each due between 10 and 60 minutes from now - like a real support desk. Open each one, set its category and priority, reply to the customer and leave a note for your team. AI marks every ticket.
          </p>
          <button type="button" onClick={() => void startShift()} disabled={busy} className="btn-primary mt-5 w-full sm:w-auto">
            <Icon as={PlayCircle} />
            {busy ? "Filling your queue..." : "Start my shift"}
          </button>
          <p className="mt-2 text-xs text-slate-500">The shift is free; each marked ticket uses one AI ticket review from your plan.</p>
        </section>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Your queue at a glance">
            {tiles.map((t) => (
              <li key={t.label} className="card flex items-center gap-3 p-4">
                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${t.tone}`}>
                  <Icon as={t.icon} />
                </span>
                <span className="min-w-0">
                  <span className="num block font-display text-2xl font-bold text-ink-950">{t.value}</span>
                  <span className="block text-xs text-slate-500">{t.label}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-ink-950">Your queue</h2>
                <span className="text-xs text-slate-500">Shift started {new Date(shift.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <ul className="card mt-3 divide-y divide-slate-100">
                {shift.tickets.map((t) => {
                  const info = ticketOf(t.key);
                  if (!info) return null;
                  const overdue = isOverdue(t, now);
                  const soon = isDueSoon(t, now);
                  return (
                    <li key={t.key} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-muted text-slate-600" title={info.channel}>
                        <Icon as={CHANNEL_ICON[info.channel] ?? Inbox} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink-900">{info.subject}</span>
                        <span className="block text-xs text-slate-500">
                          {info.customerName} · {info.channel}
                          {t.status === "on_hold" ? " · On hold" : ""}
                        </span>
                      </span>
                      <span className={`flex w-full items-center gap-1 pl-12 text-xs font-medium sm:w-auto sm:pl-0 ${t.status === "resolved" ? "text-green-700" : overdue ? "text-red-700" : soon ? "text-amber-700" : "text-slate-600"}`}>
                        <Icon as={t.status === "resolved" ? CheckCircle2 : AlarmClock} />
                        {dueLabel(t, now)}
                        {t.status === "resolved" && typeof t.score === "number" ? ` · ${t.score}/100` : ""}
                      </span>
                      {t.status !== "resolved" && (
                        <span className="flex w-full gap-2 sm:w-auto">
                          <button type="button" onClick={() => setWorking(t.key)} className="btn-primary btn-sm flex-1 sm:flex-none">
                            Open
                          </button>
                          <button type="button" onClick={() => void setHold(t.key, t.status === "on_hold" ? "resume" : "hold")} className="btn-secondary btn-sm flex-1 sm:flex-none">
                            {t.status === "on_hold" ? "Resume" : "Hold"}
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {counts && counts.resolved === shift.tickets.length && (
                <p className="mt-3 rounded-xl bg-green-50 p-4 text-sm text-green-800">Queue cleared - well done. Start a new shift whenever you are ready.</p>
              )}
              <button type="button" onClick={() => void startShift()} disabled={busy} className="btn-secondary mt-4 w-full sm:w-auto">
                {busy ? "Filling your queue..." : "Start a new shift"}
              </button>
            </section>

            <section className="card h-fit p-5">
              <h2 className="font-display text-base font-bold text-ink-950">Customer happiness</h2>
              {happiness ? (
                <>
                  <p className="mt-1 text-xs text-slate-500">From your last {happiness.responses} marked ticket{happiness.responses === 1 ? "" : "s"}.</p>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${happiness.happy}% happy, ${happiness.neutral}% neutral, ${happiness.unhappy}% unhappy`}>
                    <span className="bg-green-500" style={{ width: `${happiness.happy}%` }} />
                    <span className="bg-amber-400" style={{ width: `${happiness.neutral}%` }} />
                    <span className="bg-red-500" style={{ width: `${happiness.unhappy}%` }} />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Happy", happiness.happy, "text-green-700"],
                      ["Neutral", happiness.neutral, "text-amber-700"],
                      ["Unhappy", happiness.unhappy, "text-red-700"],
                    ].map(([label, value, tone]) => (
                      <div key={label as string}>
                        <dt className={`text-xs font-medium ${tone}`}>{label}</dt>
                        <dd className="num font-display text-xl font-bold text-ink-950">{value}%</dd>
                      </div>
                    ))}
                  </dl>
                  <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-600">Average quality</dt>
                      <dd className="num font-semibold text-ink-900">{happiness.averageScore} / 100</dd>
                    </div>
                    {onTime !== null && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-600">On time this shift</dt>
                        <dd className="num font-semibold text-ink-900">{onTime}%</dd>
                      </div>
                    )}
                  </dl>
                  <p className="mt-3 text-xs text-slate-500">A ticket scoring 80+ counts as a happy customer, 50-79 neutral, below 50 unhappy.</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Resolve your first ticket to see how your customers would feel.</p>
              )}
            </section>
          </div>
        </>
      )}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    </div>
  );
}
