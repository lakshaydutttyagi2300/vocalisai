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
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks =
    session?.user.role === "ADMIN" ? [...NAV_LINKS, { href: "/admin", label: "Admin" }] : NAV_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink-950">
          Pro<span className="text-brand-600">Acting</span>
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
