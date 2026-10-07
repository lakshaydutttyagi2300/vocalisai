import Link from "next/link";
import { getServerSession } from "next-auth";
import { Award } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { formatCertificateDate } from "@/lib/certificates/designs";

export const metadata = { title: "My certificates - VocalisAi" };

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  const certificates = await db.certificate.findMany({
    where: { userId: session!.user.id, revokedAt: null },
    orderBy: { issuedAt: "desc" },
    select: { code: true, testName: true, kind: true, score: true, completedAt: true },
  });

  return (
    <div className="page-container py-10">
      <p className="eyebrow">Achievements</p>
      <h1 className="headline mt-2 text-3xl text-ink-950">My certificates</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        A certificate is issued for every mock exam you complete in full on a paid plan. Each one has its own ID and QR code that anyone can check.
      </p>

      {certificates.length === 0 ? (
        <div className="card mt-8 p-6 text-sm text-slate-600">
          No certificates yet. Complete a mock exam, answering every question, to get your first one.{" "}
          <Link href="/mock-tests" className="font-semibold text-accent-strong underline-offset-2 hover:underline">
            Go to Mock Exams
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {certificates.map((c) => (
            <li key={c.code}>
              <Link href={`/certificates/${c.code}`} className="card flex items-start gap-4 p-5 transition hover:border-accent">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-strong">
                  <Icon as={Award} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-bold text-ink-900">{c.testName}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">
                    Certificate of {c.kind === "ACHIEVEMENT" ? "Achievement" : "Completion"}
                    {c.score !== null ? ` · ${c.score}/100` : ""} · {formatCertificateDate(c.completedAt)}
                  </span>
                  <span className="num mt-1 block text-xs text-slate-500">{c.code}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
