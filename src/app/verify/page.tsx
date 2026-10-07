import { redirect } from "next/navigation";
import { normalizeCertificateCode } from "@/lib/certificates/code";

export const metadata = { title: "Verify a certificate - VocalisAi" };

// Public: type a certificate ID to check it.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const normalized = code ? normalizeCertificateCode(code) : null;
  if (code) redirect(`/verify/${encodeURIComponent(normalized ?? code.trim())}`);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="eyebrow">VocalisAi certificate check</p>
      <h1 className="headline mt-2 text-3xl text-ink-950">Verify a certificate</h1>
      <p className="mt-2 text-sm text-slate-600">Enter the certificate ID printed under the QR code, or scan the code with your phone.</p>
      <form action="/verify" className="mt-6 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="code">Certificate ID</label>
        <input id="code" name="code" required placeholder="VAI-XXXX-XXXX-XXXX" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        <button className="btn-primary">Check</button>
      </form>
    </div>
  );
}
