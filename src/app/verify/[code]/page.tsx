import Link from "next/link";
import { BadgeCheck, CircleX } from "lucide-react";
import { db } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { normalizeCertificateCode } from "@/lib/certificates/code";
import { formatCertificateDate } from "@/lib/certificates/designs";

export const metadata = { title: "Verify a certificate - VocalisAi", robots: { index: false } };

// Public check of a certificate (no sign-in): only what is printed on the
// certificate itself - never an email address or any other account detail.
export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCertificateCode(decodeURIComponent(raw));
  const cert = code
    ? await db.certificate.findUnique({ where: { code }, select: { code: true, recipientName: true, testName: true, kind: true, score: true, completedAt: true, issuedAt: true, revokedAt: true } })
    : null;
  const valid = !!cert && !cert.revokedAt;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="eyebrow">VocalisAi certificate check</p>
      <div className={`card mt-4 p-6 ${valid ? "border-success" : "border-danger"}`}>
        <div className="flex items-center gap-3">
          <Icon as={valid ? BadgeCheck : CircleX} size="md" className={valid ? "text-success-strong" : "text-danger-strong"} />
          <h1 className="font-display text-xl font-bold text-ink-950">
            {valid ? "Valid certificate" : cert ? "This certificate has been withdrawn" : "No certificate with this ID"}
          </h1>
        </div>
        {cert ? (
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <Row label="Awarded to" value={cert.recipientName} />
            <Row label="Certificate" value={`Certificate of ${cert.kind === "ACHIEVEMENT" ? "Achievement" : "Completion"}`} />
            <Row label="Test" value={cert.testName} />
            {cert.score !== null && <Row label="Score" value={`${cert.score} / 100`} />}
            <Row label="Completed on" value={formatCertificateDate(cert.completedAt)} />
            <Row label="Certificate ID" value={cert.code} mono />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Check the ID for typing mistakes. It looks like <span className="num">VAI-XXXX-XXXX-XXXX</span> and is printed under the QR code.
          </p>
        )}
        {valid && <p className="mt-5 text-xs text-slate-500">Issued by VocalisAi on {formatCertificateDate(cert.issuedAt)} after the test was completed in full.</p>}
      </div>
      <form action="/verify" className="mt-8 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="verify-code">Certificate ID</label>
        <input id="verify-code" name="code" placeholder="VAI-XXXX-XXXX-XXXX" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        <button className="btn-secondary">Check another</button>
      </form>
      <p className="mt-8 text-sm text-slate-600">
        <Link href="/" className="text-accent-strong underline-offset-2 hover:underline">
          About VocalisAi
        </Link>
      </p>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words font-semibold text-ink-900 ${mono ? "num" : ""}`}>{value}</dd>
    </div>
  );
}
