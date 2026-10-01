"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export interface GoalOption {
  slug: string;
  name: string;
  tagline: string;
  includes: string[];
}

// Goal tracks as tabs (ARIA tabs pattern: arrow keys move between goals).
export default function GoalExplorer({ goals, ctaHref }: { goals: GoalOption[]; ctaHref: string }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const goal = goals[active];

  function onKeyDown(e: KeyboardEvent) {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + goals.length) % goals.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  if (!goal) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
      <div role="tablist" aria-label="Goals" aria-orientation="vertical" onKeyDown={onKeyDown} className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {goals.map((g, i) => {
          const selected = i === active;
          return (
            <button
              key={g.slug}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`goal-tab-${g.slug}`}
              aria-selected={selected}
              aria-controls="goal-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`group flex flex-none items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors lg:py-4 ${
                selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-ink-800 hover:border-slate-300"
              }`}
            >
              <span className="whitespace-nowrap">{g.name}</span>
              <Icon as={ArrowRight} className={`hidden lg:block ${selected ? "text-amber-300" : "text-slate-300 group-hover:text-slate-500"}`} />
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="goal-panel" aria-labelledby={`goal-tab-${goal.slug}`} className="sheet flex min-w-0 flex-col p-7 sm:p-10">
        <p className="eyebrow">Goal track</p>
        <h3 className="headline mt-3 text-3xl text-ink-950 sm:text-4xl">{goal.name}</h3>
        <p className="lede mt-3">{goal.tagline}</p>
        <ul className="mt-8 grid gap-4 border-t border-slate-100 pt-8 sm:grid-cols-3">
          {goal.includes.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-800">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon as={Check} size="xs" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Link href={ctaHref} className="btn-primary">
            Start with this goal
            <Icon as={ArrowRight} />
          </Link>
        </div>
      </div>
    </div>
  );
}
