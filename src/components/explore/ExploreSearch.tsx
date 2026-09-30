"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CATALOGUE, isAvailable } from "@/lib/catalogue";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";

const MODE_LABELS = new Map(PRACTICE_MODES.map((m) => [m.slug, m.label]));

// Every exam as one searchable line: its name, category, subjects and keywords.
const INDEX = CATALOGUE.flatMap((c) =>
  c.exams.map((e) => ({
    href: `/explore/${c.id}/${e.id}`,
    name: e.name,
    category: c.name,
    available: isAvailable(e),
    subjects: e.subjects.map((s) => MODE_LABELS.get(s) ?? s),
    text: [e.name, c.name, e.summary, ...e.subjects.map((s) => MODE_LABELS.get(s) ?? s), ...(e.upcoming ?? []), ...(e.keywords ?? [])].join(" ").toLowerCase(),
  }))
);

export function ExploreSearch() {
  const [query, setQuery] = useState("");
  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => (words.length === 0 ? [] : INDEX.filter((e) => words.every((w) => e.text.includes(w))).slice(0, 12)), [words]);

  return (
    <div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search exams, subjects and skills</span>
        <Icon as={Search} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: IELTS, banking, interview, grammar..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-ink-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {words.length > 0 && (
        <div className="mt-4 max-w-3xl" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-sm text-slate-600">No exams match &ldquo;{query}&rdquo;. Try a subject such as grammar or reasoning.</p>
          ) : (
            <ul aria-label="Search results" className="sheet divide-y divide-slate-100 overflow-hidden">
              {results.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="group flex items-start gap-4 px-5 py-4 hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{r.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {r.category}
                        {r.available ? ` · ${r.subjects.join(", ")}` : " · Coming soon"}
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
