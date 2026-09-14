"use client";

import { useEffect } from "react";
// Re-imported directly: this file replaces the root layout entirely when it
// renders, so it can't rely on layout.tsx's import having already run.
import "./globals.css";

// error.tsx only catches errors thrown while rendering inside the root
// layout's children - it can't catch an error thrown by the root layout
// itself (e.g. a broken Providers/Navbar). This is the only boundary for
// that case, so it has to render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold text-ink-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            The app hit an unexpected error and couldn&apos;t load. You can try again, or come back later.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
