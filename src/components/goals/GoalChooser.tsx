"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Check, Headphones, MessagesSquare, type LucideIcon } from "lucide-react";
import { Icon, IconBadge } from "@/components/ui/Icon";

export interface GoalOption {
  slug: string;
  name: string;
  tagline: string;
  includes: string[];
}

const ICONS: Record<string, LucideIcon> = {
  GENERAL_ENGLISH: MessagesSquare,
  BPO_SUPPORT: Headphones,
  INTERVIEW_PREP: Briefcase,
};

export function GoalChooser({ goals, current }: { goals: GoalOption[]; current: string | null }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: chosen }) });
      if (!res.ok) {
        setError((await res.json().catch(() => ({})))?.error ?? "Couldn't save your goal. Please try again.");
        setSaving(false);
        return;
      }
      router.push("/goal");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Choose your goal" className="grid gap-4 md:grid-cols-3">
        {goals.map((g) => {
          const selected = chosen === g.slug;
          return (
            <button
              key={g.slug}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setChosen(g.slug)}
              className={`flex flex-col rounded-xl border-2 p-5 text-left transition ${
                selected ? "border-brand-600 bg-brand-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <IconBadge as={ICONS[g.slug] ?? MessagesSquare} />
                <span
                  aria-hidden="true"
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </span>
              <span className="mt-3 font-display text-lg font-bold text-ink-950">{g.name}</span>
              <span className="mt-1 text-sm text-slate-600">{g.tagline}</span>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {g.includes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Icon as={Check} className="mt-0.5 text-brand-600" />
                    {line}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button onClick={save} disabled={!chosen} data-loading={saving || undefined} className="btn-primary btn-lg mt-6">
        {saving ? "Saving..." : current ? "Save my goal" : "Start my plan"}
        <Icon as={ArrowRight} />
      </button>
    </div>
  );
}
