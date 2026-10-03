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
      <body className="min-h-screen bg-bg text-fg antialiased">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold text-fg">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            The app hit an unexpected error and couldn&apos;t load. You can try again, or come back later.
          </p>
          <button
            onClick={reset}
            className="btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
