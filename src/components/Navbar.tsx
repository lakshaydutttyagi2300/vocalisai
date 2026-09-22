"use client";

import { useState } from "react";
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

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/candidates", label: "Candidates" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/dashboard", label: "Candidate view" },
];

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
  const navLinks = isAdmin ? ADMIN_LINKS : NAV_LINKS;

  if (isAdmin) {
    return (
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <BrandGlyph tone="amber" />
            <span className="text-lg font-bold tracking-tight text-white">
              VocalisAi <span className="text-amber-500">Admin</span>
            </span>
          </Link>

          <nav className="hidden gap-7 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 text-sm font-medium transition-colors ${
                    active ? "text-amber-500" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {link.label}
                  {active && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-amber-500" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="badge" style={{ backgroundColor: "#3a2c15", color: "#e5ab52" }}>
              Admin
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-md border border-ink-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-ink-800"
            >
              Log out
            </button>
          </div>
        </div>
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
