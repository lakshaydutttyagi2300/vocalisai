"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export interface SearchItem {
  href: string;
  name: string;
  /** What kind of thing this is, shown under the name: "Company assessment", "Skill · Logical Reasoning", ... */
  kind: string;
  detail?: string;
  /** Lower-case text the search matches against. */
  text: string;
}

// Matches every word typed; results are companies, assessments, practice areas and skills.
export function ExploreSearch({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => {
    if (words.length === 0) return [];
    const phrase = words.join(" ");
    // Names that match beat things that merely mention the words; practice areas edge ahead,
    // so "reasoning" leads straight to reasoning practice.
    const score = (e: SearchItem) => {
      const name = e.name.toLowerCase();
      return (name.startsWith(phrase) ? 4 : 0) + (words.every((w) => name.includes(w)) ? 2 : 0) + (e.kind === "Practice area" ? 1 : 0);
    };
    return items
      .filter((e) => words.every((w) => e.text.includes(w)))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 12);
  }, [items, words]);

  return (
    <div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search companies, assessments and skills</span>
        <Icon as={Search} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: AMCAT, TCS NQT, reasoning, quantitative aptitude..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-ink-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {words.length > 0 && (
        <div className="mt-4 max-w-3xl" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing matches &ldquo;{query}&rdquo;. Try a company (Infosys), a test (AMCAT) or a skill (syllogism).</p>
          ) : (
            <ul aria-label="Search results" className="sheet divide-y divide-slate-100 overflow-hidden">
              {results.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="group flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{r.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {r.kind}
                        {r.detail && ` · ${r.detail}`}
                      </span>
                    </span>
                    <Icon as={ArrowUpRight} className="mt-0.5 flex-none text-slate-300 group-hover:text-brand-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
