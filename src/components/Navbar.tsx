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

// Visitors (signed out): the product site's menu.
const SITE_NAV: CandidateEntry[] = [
  {
    kind: "group",
    label: "Product",
    match: ["/product"],
    items: [
      { href: "/product/speaking", label: "Speaking practice", hint: "Feedback on pronunciation, fluency, grammar and pace" },
      { href: "/product/interviews", label: "AI interviews", hint: "An AI interviewer, customer or manager that replies to you" },
      { href: "/product/personalised", label: "Personalised practice", hint: "Your goal, your weakest skills, your level" },
    ],
  },
  { kind: "link", href: "/use-cases", label: "Solutions", match: ["/use-cases"] },
  { kind: "link", href: "/pricing", label: "Pricing", match: ["/pricing"] },
  {
    kind: "group",
    label: "Resources",
    match: ["/explore", "/about", "/contact"],
    items: [
      { href: "/roles", label: "Prepare by job role", hint: "Customer support, phone banking, retention and 60 more" },
      { href: "/explore", label: "Exam library", hint: "AMCAT, TCS NQT, reasoning, English and more" },
      { href: "/about", label: "About VocalisAi", hint: "Why we built it and how it works" },
      { href: "/contact", label: "Contact", hint: "Questions, schools and companies" },
    ],
  },
];

const CANDIDATE_NAV: CandidateEntry[] = [
  { kind: "link", href: "/dashboard", label: "Dashboard", match: ["/dashboard"] },
  {
    kind: "group",
    label: "Practice",
    match: ["/practice", "/skills", "/explore", "/bookmarks", "/performance"],
    items: [
      { href: "/roles", label: "Prepare by job role", hint: "Pick your job, get the practice that matters for it" },
      { href: "/explore", label: "Explore exams", hint: "Company assessments and skills: AMCAT, TCS NQT, reasoning and more" },
      { href: "/explore/skills", label: "Practice by skill", hint: "Critical thinking, data interpretation, reasoning, English and more" },
      { href: "/practice-tests", label: "Test history", hint: "Every exam practice test, with review" },
      { href: "/performance", label: "Performance", hint: "Accuracy and speed by subject, skill and level" },
      { href: "/bookmarks", label: "Bookmarks", hint: "Questions you saved to revise" },
      { href: "/skills", label: "My skills", hint: "Your strengths, weak spots and quick skill drills" },
      { href: "/practice", label: "Practice library", hint: "Grammar, speaking, aptitude, interviews and more" },
      { href: "/practice/conversation", label: "AI conversation", hint: "Talk live with an AI customer or interviewer" },
      { href: "/practice/quick", label: "Quick practice", hint: "A short drill when you're short on time" },
      { href: "/practice/typing", label: "Typing test", hint: "Speed and accuracy for chat, email and back-office jobs" },
      { href: "/practice/email", label: "Email writing", hint: "Reply to a customer email, marked by AI" },
      { href: "/goal", label: "My goal plan", hint: "Your goal, your readiness and your next steps" },
      { href: "/readiness", label: "International Process readiness", hint: "Your % ready for international voice and chat roles" },
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
      { href: "/certificates", label: "My certificates", hint: "Certificates for the mock exams you completed" },
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
          active || open ? "text-fg" : "text-fg-muted hover:text-fg"
        }`}
      >
        {entry.label}
        <Icon as={ChevronDown} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {active && <span className="absolute -bottom-[17px] left-0 right-0 h-px bg-accent" />}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-4 w-72 -translate-x-1/2 max-h-[calc(100svh-6rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-lg)]">
          {entry.items.map((item) => {
            const itemActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={itemActive ? "page" : undefined}
                className={`block rounded-xl px-3 py-2.5 transition-colors ${itemActive ? "bg-accent-softer" : "hover:bg-surface-muted"}`}
              >
                <span className={`block text-sm font-medium ${itemActive ? "text-accent-strong" : "text-fg"}`}>{item.label}</span>
                {item.hint && <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">{item.hint}</span>}
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
      { href: "/admin/catalogue", label: "Exam catalogue", hint: "Categories, exams, subjects and skills" },
      { href: "/admin/catalogue/questions", label: "Catalogue questions", hint: "Question bank by exam, subject, skill and level" },
    ],
  },
  {
    kind: "group",
    label: "Settings",
    items: [
      { href: "/admin/features", label: "Features", hint: "Switch features on or off" },
      { href: "/admin/scoring", label: "Scoring", hint: "Scoring weights and rules" },
      { href: "/admin/password", label: "Sign-in details", hint: "Change your admin sign-in email (username) or password" },
    ],
  },
  { kind: "link", href: "/admin/audit-log", label: "Activity Log" },
];

const ADMIN_LINKS: AdminLink[] = ADMIN_NAV.flatMap((e) => (e.kind === "link" ? [e] : e.items));

// High-contrast admin bar: near-white text on the dark background, a soft
// highlight on hover, and the current section as a solid amber pill with
// dark text - readable at a glance, not just a thin underline.
const ADMIN_ITEM = "flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] font-semibold transition-colors";
const ADMIN_ITEM_IDLE = "text-fg-muted hover:bg-surface-muted hover:text-fg";
const ADMIN_ITEM_ACTIVE = "bg-accent-soft text-accent-strong";
const ADMIN_ITEM_OPEN = "bg-surface-muted text-fg";

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
        <div className="absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 max-h-[calc(100svh-6rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-lg)]">
          {items.map((item) => {
            const itemActive = isActiveAdmin(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={itemActive ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 transition-colors ${itemActive ? "bg-accent-soft" : "hover:bg-surface-muted"}`}
              >
                <span className={`block text-[15px] font-semibold ${itemActive ? "text-accent-strong" : "text-fg"}`}>{item.label}</span>
                {item.hint && <span className="block text-[13px] text-fg-muted">{item.hint}</span>}
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
        tone === "teal" ? "bg-accent" : "bg-amber-500"
      }`}
    >
      <Icon as={Mic} size="md" className="text-ink-950" />
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
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="page-container flex items-center justify-between gap-6 py-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <BrandGlyph tone="amber" />
            <span className="whitespace-nowrap text-lg font-bold tracking-tight text-fg">
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
              className="hidden whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg lg:inline"
            >
              Candidate view
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn-secondary btn-sm whitespace-nowrap"
            >
              Log out
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="rounded-lg border border-line-strong p-2 text-fg md:hidden"
            >
              <Icon as={mobileOpen ? X : Menu} size="md" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav aria-label="Admin" className="border-t border-line px-6 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {[...ADMIN_LINKS, { href: "/dashboard", label: "Candidate view" }].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-[15px] font-semibold ${
                    isActiveAdmin(pathname, link.href) ? "bg-accent-soft text-accent-strong" : "text-fg-muted hover:bg-surface-muted hover:text-fg"
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
    <header
      className="site-header sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl"
    >
      <div className="page-container flex items-center justify-between gap-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandGlyph tone="teal" />
          <span className="font-display text-lg font-semibold tracking-tight text-fg">
            Vocalis<span className="text-accent">Ai</span>
          </span>
        </Link>

        {status === "unauthenticated" && (
          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {SITE_NAV.map((entry) =>
              entry.kind === "group" ? (
                <CandidateDropdown key={entry.label} entry={entry} pathname={pathname} />
              ) : (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={inArea(pathname, entry.match) ? "page" : undefined}
                  className={`text-sm font-medium transition-colors ${inArea(pathname, entry.match) ? "text-fg" : "text-fg-muted hover:text-fg"}`}
                >
                  {entry.label}
                </Link>
              )
            )}
          </nav>
        )}

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
                    active ? "text-fg" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {entry.label}
                  {active && <span className="absolute -bottom-[17px] left-0 right-0 h-px bg-accent" />}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-full bg-fg/10" />
          ) : session ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="badge badge-skill hidden whitespace-nowrap sm:inline-flex">
                  Admin panel
                </Link>
              )}
              <span className="hidden max-w-[10rem] truncate text-sm text-fg-muted 2xl:inline">{session.user.name}</span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary whitespace-nowrap">
                Log out
              </button>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                className="rounded-full border border-line p-2 text-fg lg:hidden"
              >
                <Icon as={mobileOpen ? X : Menu} size="md" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-fg-muted transition-colors hover:text-fg sm:inline">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary btn-sm">
                Get started
              </Link>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                className="rounded-full border border-line p-2 text-fg lg:hidden"
              >
                <Icon as={mobileOpen ? X : Menu} size="md" />
              </button>
            </>
          )}
        </div>
      </div>

      {status !== "loading" && mobileOpen && (
        <nav aria-label="Main" className="max-h-[calc(100svh-4.5rem)] overflow-y-auto border-t border-line px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {(status === "authenticated" ? CANDIDATE_NAV : SITE_NAV).map((entry) => {
              const links = entry.kind === "link" ? [entry] : entry.items;
              return (
                <div key={entry.label}>
                  {entry.kind === "group" && <p className="px-2 pb-1 text-xs font-medium uppercase tracking-[0.18em] text-fg-subtle">{entry.label}</p>}
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-lg px-2 py-2 text-sm font-medium ${
                        pathname === link.href ? "bg-accent-soft text-accent-strong" : "text-fg-muted hover:bg-surface-muted hover:text-fg"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              );
            })}
            {status === "unauthenticated" && (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm font-medium text-fg-muted hover:text-fg">
                Log in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
