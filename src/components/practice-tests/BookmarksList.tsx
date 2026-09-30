"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookmarkX } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export interface BookmarkItem {
  questionId: string;
  prompt: string;
  subject: string | null;
  level: string;
}

export function BookmarksList({ initial }: { initial: BookmarkItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setItems((list) => list.filter((b) => b.questionId !== id));
    await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: id, bookmarked: false }) }).catch(() => null);
  }

  async function practise() {
    setStarting(true);
    setError(null);
    const res = await fetch("/api/practice-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "BOOKMARKS", difficulty: "BEGINNER", timed: false, count: Math.min(50, Math.max(5, items.length)) }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "We couldn't start your test. Please try again.");
      setStarting(false);
      return;
    }
    router.push(`/practice-tests/${data.testId}`);
  }

  if (items.length === 0) {
    return <p className="sheet mt-8 p-6 text-sm text-slate-600">No bookmarks yet. Tap &ldquo;Bookmark&rdquo; on any question in a test to save it here.</p>;
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={practise} disabled={starting} data-loading={starting || undefined} className="btn-primary">
          Practise my bookmarks
          <Icon as={ArrowRight} />
        </button>
        <span className="text-sm text-slate-500">
          {items.length} question{items.length === 1 ? "" : "s"}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul aria-label="Bookmarked questions" className="sheet mt-6 divide-y divide-slate-100 overflow-hidden">
        {items.map((b) => (
          <li key={b.questionId} className="flex items-start gap-4 px-5 py-4">
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-sm font-medium text-ink-950">{b.prompt}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {[b.subject, b.level.charAt(0) + b.level.slice(1).toLowerCase()].filter(Boolean).join(" · ")}
              </span>
            </span>
            <button onClick={() => remove(b.questionId)} aria-label="Remove bookmark" className="btn-ghost btn-sm -mr-2">
              <Icon as={BookmarkX} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
