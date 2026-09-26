"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, Menu, Mic, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

// Candidate menu, grouped by what a candidate is trying to do. Each group's
// `match` decides when it's highlighted (any page inside that area).
interface CandidateLink {
  href: string;
  label: string;
  hint?: string;
}
type CandidateEntry =
  | ({ kind: "link"; match: string[] } & CandidateLink)
  | { kind: "group"; label: string; match: string[]; items: CandidateLink[] };

const CANDIDATE_NAV: CandidateEntry[] = [
  { kind: "link", href: "/dashboard", label: "Dashboard", match: ["/dashboard"] },
  {
    kind: "group",
    label: "Practice",
    match: ["/practice", "/skills"],
    items: [
      { href: "/skills", label: "My skills", hint: "Your strengths, weak spots and quick skill drills" },
      { href: "/practice", label: "Practice library", hint: "Grammar, speaking, aptitude, interviews and more" },
      { href: "/practice/conversation", label: "AI conversation", hint: "Talk live with an AI customer or interviewer" },
      { href: "/practice/quick", label: "Quick practice", hint: "A short drill when you're short on time" },
      { href: "/goal", label: "My goal plan", hint: "Your goal, your readiness and your next steps" },
    ],
  },
  {
    kind: "group",
    label: "Mock Exams",
    match: ["/mock-tests", "/exam"],
    items: [
      { href: "/mock-tests", label: "Take a mock exam", hint: "Timed, proctored assessments and practice tests" },
      { href: "/mock-tests/history", label: "My results", hint: "Every mock exam you've taken" },
    ],
  },
  { kind: "link", href: "/speech-analysis", label: "Speech Analysis", match: ["/speech-analysis"] },
  { kind: "link", href: "/progress", label: "Progress", match: ["/progress"] },
  { kind: "link", href: "/coach", label: "AI Coach", match: ["/coach"] },
  {
    kind: "group",
    label: "Account",
    match: ["/profile", "/billing"],
    items: [
      { href: "/profile", label: "Profile", hint: "Your details and password" },
      { href: "/billing", label: "Plan & billing", hint: "Your plan and what's included" },
    ],
  },
];

const inArea = (pathname: string, match: string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

function CandidateDropdown({ entry, pathname }: { entry: Extract<CandidateEntry, { kind: "group" }>; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = inArea(pathname, entry.match);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        data-active={active ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1 whitespace-nowrap py-1 text-sm font-medium transition-colors ${
          active || open ? "text-brand-600" : "text-slate-600 hover:text-ink-900"
        }`}
      >
        {entry.label}
        <Icon as={ChevronDown} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {active && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-brand-600" />}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-4 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {entry.items.map((item) => {
            const itemActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={itemActive ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 transition-colors ${itemActive ? "bg-brand-50" : "hover:bg-slate-50"}`}
              >
                <span className={`block text-sm font-semibold ${itemActive ? "text-brand-700" : "text-ink-900"}`}>{item.label}</span>
                {item.hint && <span className="block text-xs text-slate-500">{item.hint}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AdminLink {
  href: string;
  label: string;
  hint?: string;
}

// Grouped so the bar stays on one line as admin pages grow: related
// pages sit under a dropdown instead of each taking a top-level slot.
const ADMIN_NAV: ({ kind: "link" } & AdminLink | { kind: "group"; label: string; items: AdminLink[] })[] = [
  { kind: "link", href: "/admin", label: "Overview" },
  { kind: "link", href: "/admin/candidates", label: "Candidates" },
  {
    kind: "group",
    label: "Content",
    items: [
      { href: "/admin/questions", label: "Questions", hint: "Question bank and bulk import" },
      { href: "/admin/item-groups", label: "Item groups", hint: "Passages, audio, charts" },
      { href: "/admin/exams", label: "Exams", hint: "Exam formats, papers and parts" },
      { href: "/admin/templates", label: "Templates", hint: "Mock test line-ups" },
    ],
  },
  {
    kind: "group",
    label: "Settings",
    items: [
      { href: "/admin/features", label: "Features", hint: "Switch features on or off" },
      { href: "/admin/scoring", label: "Scoring", hint: "Scoring weights and rules" },
    ],
  },
  { kind: "link", href: "/admin/audit-log", label: "Activity Log" },
];

const ADMIN_LINKS: AdminLink[] = ADMIN_NAV.flatMap((e) => (e.kind === "link" ? [e] : e.items));

// High-contrast admin bar: near-white text on the dark background, a soft
// highlight on hover, and the current section as a solid amber pill with
// dark text - readable at a glance, not just a thin underline.
const ADMIN_ITEM = "flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] font-semibold transition-colors";
const ADMIN_ITEM_IDLE = "text-slate-100 hover:bg-white/10 hover:text-white";
const ADMIN_ITEM_ACTIVE = "bg-amber-400 text-ink-950";
const ADMIN_ITEM_OPEN = "bg-white/15 text-white";

function isActiveAdmin(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function AdminDropdown({ label, items, pathname }: { label: string; items: AdminLink[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.some((i) => isActiveAdmin(pathname, i.href));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        data-active={active ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`${ADMIN_ITEM} ${active ? ADMIN_ITEM_ACTIVE : open ? ADMIN_ITEM_OPEN : ADMIN_ITEM_IDLE}`}
      >
        {label}
        <Icon as={ChevronDown} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 rounded-xl border border-slate-600 bg-ink-900 p-2 shadow-2xl">
          {items.map((item) => {
            const itemActive = isActiveAdmin(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={itemActive ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 transition-colors ${itemActive ? "bg-amber-400" : "hover:bg-white/10"}`}
              >
                <span className={`block text-[15px] font-semibold ${itemActive ? "text-ink-950" : "text-white"}`}>{item.label}</span>
                {item.hint && <span className={`block text-[13px] ${itemActive ? "text-ink-800" : "text-slate-300"}`}>{item.hint}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrandGlyph({ tone }: { tone: "teal" | "amber" }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${
        tone === "teal" ? "bg-gradient-to-br from-brand-500 to-brand-700" : "bg-amber-500"
      }`}
    >
      <Icon as={Mic} size="md" className={tone === "teal" ? "text-white" : "text-ink-950"} />
    </span>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = session?.user.role === "ADMIN" && pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <BrandGlyph tone="amber" />
            <span className="whitespace-nowrap text-lg font-bold tracking-tight text-white">
              VocalisAi <span className="text-amber-500">Admin</span>
            </span>
          </Link>

          <nav aria-label="Admin" className="hidden items-center gap-1.5 md:flex">
            {ADMIN_NAV.map((entry) => {
              if (entry.kind === "group") {
                return <AdminDropdown key={entry.label} label={entry.label} items={entry.items} pathname={pathname} />;
              }
              const active = isActiveAdmin(pathname, entry.href);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className={`${ADMIN_ITEM} ${active ? ADMIN_ITEM_ACTIVE : ADMIN_ITEM_IDLE}`}
                >
                  {entry.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] font-semibold text-slate-100 hover:bg-white/10 hover:text-white lg:inline"
            >
              Candidate view
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="whitespace-nowrap rounded-full border border-slate-400 px-4 py-1.5 text-[15px] font-semibold text-white hover:bg-white hover:text-ink-950"
            >
              Log out
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="rounded-md border border-slate-400 p-2 text-white md:hidden"
            >
              <Icon as={mobileOpen ? X : Menu} size="md" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav aria-label="Admin" className="border-t border-ink-800 px-6 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {[...ADMIN_LINKS, { href: "/dashboard", label: "Candidate view" }].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-[15px] font-semibold ${
                    isActiveAdmin(pathname, link.href) ? "bg-amber-400 text-ink-950" : "text-slate-100 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
    );
  }

  return (
    <header className="site-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandGlyph tone="teal" />
          <span className="font-display text-lg font-bold tracking-tight text-ink-950">
            Vocalis<span className="text-brand-600">Ai</span>
          </span>
        </Link>

        {status === "authenticated" && (
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {CANDIDATE_NAV.map((entry) => {
              if (entry.kind === "group") return <CandidateDropdown key={entry.label} entry={entry} pathname={pathname} />;
              const active = inArea(pathname, entry.match);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative whitespace-nowrap py-1 text-sm font-medium transition-colors ${
                    active ? "text-brand-600" : "text-slate-600 hover:text-ink-900"
                  }`}
                >
                  {entry.label}
                  {active && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-brand-600" />}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-slate-200" />
          ) : session ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="badge badge-ai hidden whitespace-nowrap sm:inline-flex">
                  Admin panel
                </Link>
              )}
              <span className="hidden max-w-[10rem] truncate text-sm text-slate-500 2xl:inline">{session.user.name}</span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary whitespace-nowrap">
                Log out
              </button>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                className="rounded-md border border-slate-300 p-2 lg:hidden"
              >
                <Icon as={mobileOpen ? X : Menu} size="md" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-ink-900">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {status === "authenticated" && mobileOpen && (
        <nav aria-label="Main" className="border-t border-slate-200 bg-white px-6 py-3 lg:hidden">
          <div className="flex flex-col gap-4">
            {CANDIDATE_NAV.map((entry) => {
              const links = entry.kind === "link" ? [entry] : entry.items;
              return (
                <div key={entry.label}>
                  {entry.kind === "group" && <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.label}</p>}
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-lg px-2 py-2 text-sm font-medium ${
                        pathname === link.href ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
