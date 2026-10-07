import type { Certificate } from "@prisma/client";
import type { CertificateView } from "./designs";

/** What the owner's browser gets: the printed facts, never internal ids. */
export function publicCertificate(c: Certificate) {
  return {
    code: c.code,
    recipientName: c.recipientName,
    testName: c.testName,
    kind: c.kind as "ACHIEVEMENT" | "COMPLETION",
    score: c.score,
    completedAt: c.completedAt.toISOString(),
    design: c.design,
    issuedAt: c.issuedAt.toISOString(),
  };
}

/** The site's own address (as in password-reset emails), else the request's origin. */
export function siteOrigin(requestUrl?: string): string {
  const fromEnv = process.env.NEXTAUTH_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return requestUrl ? new URL(requestUrl).origin : "https://vocalisai.vercel.app";
}

export function certificateView(c: Pick<Certificate, "recipientName" | "testName" | "kind" | "score" | "completedAt" | "code">, origin: string): CertificateView {
  return {
    recipientName: c.recipientName,
    testName: c.testName,
    kind: c.kind as CertificateView["kind"],
    score: c.score,
    completedAt: c.completedAt,
    code: c.code,
    verifyUrl: `${origin}/verify/${c.code}`,
  };
}
