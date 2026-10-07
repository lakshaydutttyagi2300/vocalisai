// Issues a certificate once per completed mock exam, or returns the one
// already issued (duplicate prevention: Certificate.mockTestSessionId is
// unique, so even two simultaneous requests end with a single certificate).

import { Prisma, type Certificate } from "@prisma/client";
import { db } from "@/lib/db";
import { generateCertificateCode } from "./code";
import { checkCertificateEligibility, type Eligibility } from "./eligibility";
import { defaultDesignFor, isDesignId } from "./designs";

export type CertificateOutcome = { ok: true; certificate: Certificate; created: boolean } | { ok: false; eligibility: Extract<Eligibility, { eligible: false }> };

/** The user's existing certificate for this test, if any (never someone else's). */
export async function findCertificate(sessionId: string, userId: string): Promise<Certificate | null> {
  const cert = await db.certificate.findUnique({ where: { mockTestSessionId: sessionId } });
  return cert && cert.userId === userId && !cert.revokedAt ? cert : null;
}

export async function getOrIssueCertificate(sessionId: string, userId: string, design?: string): Promise<CertificateOutcome> {
  const existing = await findCertificate(sessionId, userId);
  if (existing) return { ok: true, certificate: existing, created: false };

  const eligibility = await checkCertificateEligibility(sessionId, userId);
  if (!eligibility.eligible) return { ok: false, eligibility };

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCertificateCode();
    try {
      const certificate = await db.certificate.create({
        data: {
          code,
          userId,
          mockTestSessionId: sessionId,
          ...eligibility.facts,
          design: design && isDesignId(design) ? design : defaultDesignFor(code),
        },
      });
      return { ok: true, certificate, created: true };
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      // Another request issued it first: return that one. (Or, very rarely, the code was taken: try a new one.)
      const raced = await findCertificate(sessionId, userId);
      if (raced) return { ok: true, certificate: raced, created: false };
    }
  }
  throw new Error("Couldn't issue a unique certificate code");
}
