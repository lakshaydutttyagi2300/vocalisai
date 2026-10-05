"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CONVERSATION_ROLES } from "@/lib/conversation-roles";
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from "@/lib/practice-taxonomy";
import { MediaHero } from "@/components/ui/MediaHero";
import { placed } from "@/config/mediaLibrary";

function ConversationSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRole = searchParams.get("role");
  const [role, setRole] = useState<string | null>(
    CONVERSATION_ROLES.some((r) => r.role === preselectedRole) ? preselectedRole : null
  );
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
    <div className="pb-20">
      <MediaHero back={{ label: "Back to Practice", href: "/practice" }} eyebrow="AI voice conversation · Needs mic" title="AI Voice Conversation" subtitle="A real back-and-forth role-play: you speak, the AI replies in character, and you get feedback afterwards. Not a scripted quiz." media={placed("app.conversation")} variant="split" size="sm" />
    <div className="page-container mt-10">
      <p className="text-base font-semibold text-fg">Who do you want to talk to?</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CONVERSATION_ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => setRole(r.role)}
            aria-pressed={role === r.role}
            className="choice p-4 text-left"
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

      <p className="mt-8 text-base font-semibold text-fg">Difficulty</p>
      <div className="mt-3 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            aria-pressed={difficulty === d}
            className="choice flex items-center justify-center px-4 py-2.5 text-center text-sm font-semibold"
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

      <button onClick={start} disabled={!role || !difficulty} data-loading={isStarting || undefined} className="btn-primary btn-lg mt-8 w-full sm:w-auto">
        {isStarting ? "Starting..." : "Start conversation"}
      </button>
    </div>
    </div>
  );
}

export default function ConversationSetupPage() {
  return (
    <Suspense fallback={null}>
      <ConversationSetupForm />
    </Suspense>
  );
}
