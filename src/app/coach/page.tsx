"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, type ScoreCategory } from "@/lib/scoring-engine";

interface CategoryTrend {
  average: number | null;
  latest: number | null;
  trend: "up" | "down" | "flat" | null;
  sessionsWithData: number;
}

interface CoachProfile {
  sessionsCompleted: number;
  averageOverallScore: number | null;
  latestOverallScore: number | null;
  categories: Record<ScoreCategory, CategoryTrend>;
  weakest: { category: ScoreCategory; average: number }[];
  strongest: { category: ScoreCategory; average: number }[];
}

interface Message {
  id: string;
  role: "user" | "coach";
  content: string;
  createdAt: string;
}

const MAX_MESSAGE_LENGTH = 1000;

export default function CoachPage() {
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, messagesRes] = await Promise.all([
          fetch("/api/coach/profile"),
          fetch("/api/coach/messages"),
        ]);
        const [profileData, messagesData] = await Promise.all([profileRes.json(), messagesRes.json()]);

        if (!profileRes.ok || !messagesRes.ok) {
          setLoadError(profileData.error ?? messagesData.error ?? "Couldn't load your coach.");
          return;
        }
        setProfile(profileData);
        setMessages(messagesData.messages ?? []);
      } catch {
        setLoadError("Couldn't load your coach.");
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
      return;
    }

    setSending(true);
    setError(null);
    setDraft("");

    try {
      const res = await fetch("/api/coach/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();

      if (data.userMessage) setMessages((prev) => [...prev, data.userMessage]);
      if (!res.ok) {
        setError(data.error ?? "The coach couldn't respond. Please try again.");
        return;
      }
      if (data.coachMessage) setMessages((prev) => [...prev, data.coachMessage]);
    } catch {
      setError("The coach couldn't respond. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-950">Personal AI Coach</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ask about your performance and get advice grounded in your real assessment history.
      </p>

      {loaded && loadError && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {!loaded && (
        <div className="mt-6 space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-lg bg-slate-200" />
        </div>
      )}

      {loaded && profile && (
        <div className="card mt-6 p-5">
          {profile.sessionsCompleted === 0 ? (
            <p className="text-sm text-slate-600">
              You haven&apos;t completed a mock test yet, so there&apos;s no personalized history to
              show. Complete one from{" "}
              <Link href="/mock-tests" className="text-brand-600 hover:underline">
                Mock Tests
              </Link>{" "}
              and your coach will be able to reference real results - you can still chat for general
              advice below.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-900">
                  {profile.sessionsCompleted} session{profile.sessionsCompleted === 1 ? "" : "s"}{" "}
                  completed
                </span>
                <span className="text-sm text-slate-600">
                  Average score: <span className="font-semibold text-ink-900">{profile.averageOverallScore ?? "N/A"}</span>
                </span>
              </div>
              {(profile.weakest.length > 0 || profile.strongest.length > 0) && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {profile.weakest.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-700">Focus areas</p>
                      <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                        {profile.weakest.map((w) => (
                          <li key={w.category}>
                            {CATEGORY_LABELS[w.category]} - {w.average}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {profile.strongest.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700">Strengths</p>
                      <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                        {profile.strongest.map((s) => (
                          <li key={s.category}>
                            {CATEGORY_LABELS[s.category]} - {s.average}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {loaded && !loadError && (
        <div className="card mt-4 flex h-[28rem] flex-col p-5">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">
                Say hello, or ask something like &quot;what should I focus on next?&quot;
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-400">
                  Coach is typing...
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {error && (
            <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              aria-label="Message to your coach"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Ask your coach..."
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-60"
            />
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary disabled:opacity-60">
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
