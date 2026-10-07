import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDesignId } from "@/lib/certificates/designs";
import { publicCertificate } from "@/lib/certificates/view";

const bodySchema = z.object({ design: z.string().refine(isDesignId, "Choose one of the certificate designs.") });

// The owner picks a different design. Only the look changes: the name,
// test, score, date and ID were fixed when the certificate was issued.
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Choose a design." }, { status: 400 });

  const cert = await db.certificate.findUnique({ where: { code } });
  if (!cert || cert.userId !== session.user.id || cert.revokedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.certificate.update({ where: { id: cert.id }, data: { design: parsed.data.design } });
  return NextResponse.json({ certificate: publicCertificate(updated) });
}
