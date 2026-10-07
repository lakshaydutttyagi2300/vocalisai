"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Check } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { DESIGNS, PALETTES, renderCertificateSvg, type CertificateView, type FontKey } from "@/lib/certificates/designs";

export interface OwnedCertificate {
  code: string;
  recipientName: string;
  testName: string;
  kind: "ACHIEVEMENT" | "COMPLETION";
  score: number | null;
  completedAt: string;
  design: string;
}

const LAYOUTS = [...new Map(DESIGNS.map((d) => [d.layout, d.layoutName])).entries()];

// The owner's certificate: a live preview (the same drawing as the PDF), the
// PDF to view or download, and 12 layouts x 5 colours to choose from.
export function CertificateViewer({ certificate, origin, fonts }: { certificate: OwnedCertificate; origin: string; fonts: Record<FontKey, string> }) {
  const [design, setDesign] = useState(certificate.design);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, palette] = design.split(":");

  const view: CertificateView = useMemo(
    () => ({ ...certificate, verifyUrl: `${origin}/verify/${certificate.code}` }),
    [certificate, origin]
  );
  const svg = useMemo(() => renderCertificateSvg(view, design, fonts), [view, design, fonts]);

  async function choose(next: string) {
    if (next === design) return;
    const previous = design;
    setDesign(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/certificates/${certificate.code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design: next }) });
      if (!res.ok) throw new Error();
    } catch {
      setDesign(previous);
      setError("We couldn't save that design. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const pdf = `/api/certificates/${certificate.code}/pdf`;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <div
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`Certificate of ${certificate.kind === "ACHIEVEMENT" ? "Achievement" : "Completion"} for ${certificate.recipientName}, ${certificate.testName}`}
          // Our own SVG: every text value is escaped in renderCertificateSvg.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={pdf} target="_blank" rel="noopener" className="btn-secondary">
            <Icon as={ExternalLink} />
            View certificate
          </a>
          <a href={`${pdf}?download=1`} className="btn-primary">
            <Icon as={Download} />
            Download certificate (PDF)
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Anyone can check it at {origin.replace(/^https?:\/\//, "")}/verify/{certificate.code}, or by scanning the QR code.
        </p>
      </div>

      <aside aria-label="Certificate design">
        <h2 className="font-display font-bold text-ink-900">Design</h2>
        <p className="mt-1 text-xs text-slate-500">{saving ? "Saving..." : "Pick a layout and a colour. Your details stay the same."}</p>
        {error && <p role="alert" className="mt-2 text-sm text-danger-strong">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={palette === p.id}
              aria-label={p.name}
              title={p.name}
              onClick={() => choose(`${layout}:${p.id}`)}
              className={`grid h-9 w-9 place-items-center rounded-full border-2 ${palette === p.id ? "border-ink-900" : "border-transparent"}`}
              style={{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.accent} 50%)` }}
            >
              {palette === p.id && <Icon as={Check} className="text-white" />}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Layout">
          {LAYOUTS.map(([id, name]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={layout === id}
              onClick={() => choose(`${id}:${palette}`)}
              className={`overflow-hidden rounded-md border-2 bg-white text-left transition ${layout === id ? "border-accent" : "border-slate-200 hover:border-slate-400"}`}
            >
              <span className="block [&>svg]:h-auto [&>svg]:w-full" aria-hidden dangerouslySetInnerHTML={{ __html: renderCertificateSvg(view, `${id}:${palette}`, fonts) }} />
              <span className="block px-2 py-1 text-xs font-medium text-ink-900">{name}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
