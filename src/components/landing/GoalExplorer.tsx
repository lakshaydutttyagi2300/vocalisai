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
              className={`group flex flex-none items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors lg:py-4 ${
                selected ? "border-champagne-300/60 bg-white/[0.08] text-mist-50" : "border-white/10 text-mist-400 hover:border-white/20 hover:text-mist-50"
              }`}
            >
              <span className="whitespace-nowrap">{g.name}</span>
              <Icon as={ArrowRight} className={`hidden lg:block ${selected ? "text-champagne-300" : "text-mist-500 group-hover:text-mist-300"}`} />
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="goal-panel" aria-labelledby={`goal-tab-${goal.slug}`} className="cine-surface flex min-w-0 flex-col p-7 sm:p-10">
        <p className="cine-eyebrow">Goal track</p>
        <h3 className="cine-headline mt-3 text-3xl text-mist-50 sm:text-4xl">{goal.name}</h3>
        <p className="cine-lede mt-3">{goal.tagline}</p>
        <ul className="mt-8 grid gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-3">
          {goal.includes.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-mist-300">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-champagne-300/15 text-champagne-200">
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
