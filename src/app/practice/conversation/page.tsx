"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONVERSATION_ROLES } from "@/lib/conversation-roles";
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from "@/lib/practice-taxonomy";

export default function ConversationSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!role || !difficulty) return;
    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't start the conversation.");
        setIsStarting(false);
        return;
      }
      router.push(`/practice/conversation/${data.sessionId}`);
    } catch {
      setError("Network error. Please try again.");
      setIsStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/practice" className="text-sm text-slate-500 hover:text-ink-900">
        &larr; Back to Practice
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-950">AI Voice Conversation</h1>
      <p className="mt-1 text-sm text-slate-600">
        A real back-and-forth roleplay - you speak, the AI replies in character, and you get analyzed
        afterward. Not a scripted quiz.
      </p>

      <p className="mt-8 text-sm font-medium text-slate-700">Who do you want to talk to?</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CONVERSATION_ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => setRole(r.role)}
            className={`card p-4 text-left transition ${role === r.role ? "border-brand-500 ring-1 ring-brand-500" : "hover:border-slate-300"}`}
          >
            <h2 className="font-semibold text-ink-900">{r.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{r.description}</p>
          </button>
        ))}
      </div>

      {role === "CUSTOMER" && (
        <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-700">
          You&apos;ll be given one of: angry customer, refund request, billing issue, delayed delivery,
          technical problem, product enquiry, escalation, complaint, or confused customer - picked at
          random for the difficulty you choose. This mode also gives you a fuller evaluation covering
          listening, pronunciation, fluency, tone, empathy and de-escalation.
        </p>
      )}

      <p className="mt-8 text-sm font-medium text-slate-700">Difficulty</p>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`btn-secondary justify-center py-2 ${difficulty === d ? "border-brand-500 bg-brand-50 text-brand-700" : ""}`}
          >
            {DIFFICULTY_LABELS[d]}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button onClick={start} disabled={!role || !difficulty || isStarting} className="btn-primary mt-8 w-full">
        {isStarting ? "Starting..." : "Start conversation"}
      </button>
    </div>
  );
}
