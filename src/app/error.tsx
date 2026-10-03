"use client";

import { useEffect } from "react";

export default function Error({
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
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="eyebrow">Sorry</p>
      <h1 className="headline mt-3 text-3xl text-fg">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        An unexpected error occurred. You can try again, or come back later.
      </p>
      <button
        onClick={reset}
        className="btn-primary mt-6"
      >
        Try again
      </button>
    </div>
  );
}
