"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Download, ExternalLink, Lock } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

type Reason = "NOT_PAID" | "IN_PROGRESS" | "INCOMPLETE" | "SCORE_PENDING" | "NO_NAME" | "NOT_FOUND";
type State =
  | { status: "loading" }
  | { status: "ready"; code: string; kind: "ACHIEVEMENT" | "COMPLETION" }
  | { status: "unavailable"; reason: Reason; message: string }
  | { status: "error" };

// Shown on a finished mock exam's results page. The server decides
// everything (paid plan, every question answered, the user's own test) and
// returns the existing certificate rather than a second one.
export function CertificatePanel({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (cancelled) return;
      if (data?.status === "ready") setState({ status: "ready", code: data.certificate.code, kind: data.certificate.kind });
      else if (data?.status === "unavailable") setState({ status: "unavailable", reason: data.reason, message: data.message });
      else setState({ status: "error" });
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.status === "loading") return null;
  if (state.status === "error") {
    return (
      <section className="card p-6 text-sm text-slate-600" aria-label="Certificate">
        We couldn&apos;t check your certificate just now. Refresh this page in a moment.
      </section>
    );
  }

  if (state.status === "unavailable") {
    if (state.reason === "NOT_FOUND" || state.reason === "IN_PROGRESS") return null;
    return (
      <section className="card flex flex-wrap items-start gap-4 p-6" aria-labelledby="cert-title">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-muted">
          <Icon as={Lock} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cert-title" className="font-display font-bold text-ink-900">Certificate not available</h2>
          <p className="mt-1 text-sm text-slate-600">{state.message}</p>
          {state.reason === "NOT_PAID" && (
            <Link href="/pricing" className="btn-primary btn-sm mt-3">
              See plans
            </Link>
          )}
          {state.reason === "NO_NAME" && (
            <Link href="/profile" className="btn-secondary btn-sm mt-3">
              Add your name
            </Link>
          )}
        </div>
      </section>
    );
  }

  const pdf = `/api/certificates/${state.code}/pdf`;
  return (
    <section className="card border-accent bg-accent-softer p-6" aria-labelledby="cert-title">
      <p className="text-2xl" aria-hidden>
        🎉
      </p>
      <h2 id="cert-title" className="mt-1 font-display text-lg font-bold text-ink-900">
        Test Completed! Your Certificate is Ready
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Certificate of {state.kind === "ACHIEVEMENT" ? "Achievement" : "Completion"} · ID <span className="num font-semibold text-ink-900">{state.code}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/certificates/${state.code}`} className="btn-secondary">
          <Icon as={Award} />
          View Certificate
        </Link>
        <a href={`${pdf}?download=1`} className="btn-primary">
          <Icon as={Download} />
          Download Certificate
        </a>
        <a href={pdf} target="_blank" rel="noopener" className="btn-ghost text-sm">
          <Icon as={ExternalLink} />
          Open PDF
        </a>
      </div>
    </section>
  );
}
