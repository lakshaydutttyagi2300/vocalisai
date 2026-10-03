"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, ClipboardCheck, Mic, Target, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Short guides that open in a dialog. Plain advice about using VocalisAi
// well; every rule quoted here matches what the app actually does.

interface Guide {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  body: ReactNode;
  link: { href: string; label: string };
}

const GUIDES: Guide[] = [
  {
    id: "ratings",
    icon: Target,
    title: "How your skill ratings work",
    summary: "What Weak, Developing, Proficient and Mastered mean.",
    body: (
      <>
        <p>Every answer you give counts towards the skill it tests. Recent answers and harder questions count more, so your rating follows how you&apos;re doing now.</p>
        <p>A skill gets a rating after 5 answers. Until then it shows as &ldquo;Not enough data&rdquo;, never a guess.</p>
        <p>Your goal readiness is the same ratings, weighted by how much each skill matters for the goal you chose.</p>
      </>
    ),
    link: { href: "/skills", label: "See my skills" },
  },
  {
    id: "mock",
    icon: ClipboardCheck,
    title: "Before a proctored mock exam",
    summary: "A five-minute checklist so the test goes smoothly.",
    body: (
      <ul>
        <li>Use a laptop or desktop with a working camera and microphone, in a quiet, well-lit room.</li>
        <li>Close other tabs and apps. Leaving the test window is recorded.</li>
        <li>Sections are timed and questions come in a fixed order, as in the real test. Read each question once, carefully.</li>
        <li>Allow the full time shown on the test card before you start.</li>
      </ul>
    ),
    link: { href: "/mock-tests", label: "Choose a mock exam" },
  },
  {
    id: "speaking",
    icon: Mic,
    title: "Sound clear and confident",
    summary: "Pace, pauses and filler words.",
    body: (
      <ul>
        <li>Aim for about 110 to 160 words a minute. Faster than that is hard to follow on a call.</li>
        <li>Replace &ldquo;um&rdquo; and &ldquo;like&rdquo; with a short, silent pause. Pauses sound calm; fillers sound unsure.</li>
        <li>Answer in three parts: your point, one example, and a one-line close.</li>
        <li>Record, listen back, and try the same question again. The second take is usually much better.</li>
      </ul>
    ),
    link: { href: "/practice/speaking", label: "Practise speaking" },
  },
  {
    id: "habits",
    icon: BookOpen,
    title: "Make practice stick",
    summary: "Short, regular sessions beat long ones.",
    body: (
      <ul>
        <li>Practise a little every day. Ten focused minutes daily beats one long session a week.</li>
        <li>Spend most of your time on your weakest skill, not the one you enjoy.</li>
        <li>Read the explanation after every wrong answer, then bookmark questions you want to see again.</li>
        <li>Take a full mock exam every week or two to check your progress under real conditions.</li>
      </ul>
    ),
    link: { href: "/practice", label: "Open the practice library" },
  },
];

export function LearningResources() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Guide | null>(null);

  function show(g: Guide) {
    setOpen(g);
    dialog.current?.showModal();
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GUIDES.map((g) => (
          <li key={g.id}>
            <button type="button" onClick={() => show(g)} className="card lift group flex h-full w-full flex-col items-start p-5 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <Icon as={g.icon} size="md" />
              </span>
              <span className="mt-4 block font-semibold text-fg">{g.title}</span>
              <span className="mt-1 block text-sm text-fg-muted">{g.summary}</span>
              <span className="mt-4 text-sm font-semibold text-accent-strong group-hover:underline">Read the guide</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-labelledby="guide-title"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-lg)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <Icon as={open.icon} size="md" />
                </span>
                <h2 id="guide-title" className="headline text-xl text-fg">
                  {open.title}
                </h2>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="btn-ghost btn-sm h-9 w-9 flex-none px-0">
                <Icon as={X} />
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-fg-muted [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">{open.body}</div>
            <Link href={open.link.href} className="btn-primary mt-7">
              {open.link.label}
              <Icon as={ArrowUpRight} />
            </Link>
          </div>
        )}
      </dialog>
    </>
  );
}
