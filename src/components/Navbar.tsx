"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/mock-tests", label: "Mock Tests" },
  { href: "/progress", label: "Progress" },
  { href: "/coach", label: "Coach" },
  { href: "/billing", label: "Billing" },
  { href: "/profile", label: "Profile" },
];

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
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1 whitespace-nowrap py-1 text-sm font-medium transition-colors ${
          active || open ? "text-amber-500" : "text-slate-400 hover:text-white"
        }`}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
        {active && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-amber-500" />}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-4 w-64 -translate-x-1/2 rounded-lg border border-ink-700 bg-ink-900 p-1.5 shadow-xl">
          {items.map((item) => {
            const itemActive = isActiveAdmin(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={itemActive ? "page" : undefined}
                className={`block rounded-md px-3 py-2 transition-colors ${itemActive ? "bg-ink-800" : "hover:bg-ink-800"}`}
              >
                <span className={`block text-sm font-medium ${itemActive ? "text-amber-500" : "text-slate-200"}`}>{item.label}</span>
                {item.hint && <span className="block text-xs text-slate-500">{item.hint}</span>}
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"
          fill={tone === "teal" ? "white" : "#13191c"}
          fillOpacity={tone === "teal" ? 0.95 : 1}
        />
        <path
          d="M6 11v1a6 6 0 0 0 12 0v-1"
          stroke={tone === "teal" ? "white" : "#13191c"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M12 19v3" stroke={tone === "teal" ? "white" : "#13191c"} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = session?.user.role === "ADMIN" && pathname.startsWith("/admin");
  const navLinks = NAV_LINKS;

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

          <nav aria-label="Admin" className="hidden items-center gap-7 md:flex">
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
                  className={`relative whitespace-nowrap py-1 text-sm font-medium transition-colors ${
                    active ? "text-amber-500" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {entry.label}
                  {active && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-amber-500" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link href="/dashboard" className="hidden whitespace-nowrap text-sm font-medium text-slate-400 hover:text-white lg:inline">
              Candidate view
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="whitespace-nowrap rounded-md border border-ink-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-ink-800"
            >
              Log out
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="rounded-md border border-ink-700 p-2 text-slate-300 md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
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
                  className={`rounded-md px-2 py-2 text-sm font-medium ${
                    isActiveAdmin(pathname, link.href) ? "bg-ink-800 text-amber-500" : "text-slate-300"
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandGlyph tone="teal" />
          <span className="font-display text-lg font-bold tracking-tight text-ink-950">
            Vocalis<span className="text-brand-600">Ai</span>
          </span>
        </Link>

        {status === "authenticated" && (
          <nav className="hidden gap-7 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 text-sm font-medium transition-colors ${
                    active ? "text-brand-600" : "text-slate-600 hover:text-ink-900"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-brand-600" />
                  )}
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
                <Link href="/admin" className="badge badge-ai hidden sm:inline-flex">
                  Admin
                </Link>
              )}
              <span className="hidden text-sm text-slate-500 sm:inline">
                {session.user.name}
              </span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">
                Log out
              </button>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                className="rounded-md border border-slate-300 p-2 md:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
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
        <nav className="border-t border-slate-200 bg-white px-6 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium ${
                  pathname === link.href ? "text-brand-600" : "text-slate-600"
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
