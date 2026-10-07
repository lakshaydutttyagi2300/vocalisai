import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getOrIssueCertificate } from "@/lib/certificates/issue";
import { publicCertificate } from "@/lib/certificates/view";

const bodySchema = z.object({ sessionId: z.string().min(1).max(60) });

// The certificate for one of the signed-in user's mock exams: returns the
// one already issued, issues it if the server confirms a paid plan + every
// question answered + the user's own session, or explains why not.
// Nothing in the request can change the outcome except which session.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a test first." }, { status: 400 });

  const outcome = await getOrIssueCertificate(parsed.data.sessionId, session.user.id);
  if (!outcome.ok) {
    const { reason, message, answered, total } = outcome.eligibility;
    return NextResponse.json({ status: "unavailable", reason, message, answered, total }, { status: reason === "NOT_FOUND" ? 404 : 200 });
  }
  return NextResponse.json({ status: "ready", created: outcome.created, certificate: publicCertificate(outcome.certificate) });
}
