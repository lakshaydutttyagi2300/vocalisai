import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicCertificate, siteOrigin } from "@/lib/certificates/view";
import { CertificateViewer } from "@/components/certificates/CertificateViewer";
import { WEB_FONTS } from "../fonts";

export const metadata = { title: "Your certificate - VocalisAi", robots: { index: false } };

// The owner's own certificate (the public check is /verify/{code}).
export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions);
  const { code } = await params;
  const cert = await db.certificate.findUnique({ where: { code } });
  if (!cert || cert.userId !== session?.user.id || cert.revokedAt) notFound();
  const h = await headers();
  const origin = siteOrigin(`${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "vocalisai.vercel.app"}`);

  return (
    <div className="page-container py-10">
      <p className="eyebrow">Your certificate</p>
      <h1 className="headline mt-2 text-3xl text-ink-950">{cert.testName}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Certificate ID <span className="num font-semibold text-ink-900">{cert.code}</span> ·{" "}
        <Link href="/certificates" className="text-accent-strong underline-offset-2 hover:underline">
          All my certificates
        </Link>
      </p>
      <div className="mt-8">
        <CertificateViewer certificate={publicCertificate(cert)} origin={origin} fonts={WEB_FONTS} />
      </div>
    </div>
  );
}
