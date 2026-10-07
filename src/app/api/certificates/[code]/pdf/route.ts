import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { certificateView, siteOrigin } from "@/lib/certificates/view";

// The certificate PDF, for its owner only: shown in the browser, or saved
// with ?download=1. Drawn fresh from the saved facts each time.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const cert = await db.certificate.findUnique({ where: { code } });
  if (!cert || cert.userId !== session.user.id || cert.revokedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let pdf: Buffer;
  try {
    pdf = await renderCertificatePdf(certificateView(cert, siteOrigin(req.url)), cert.design);
  } catch (err) {
    console.error("certificate pdf failed", { code, err });
    return NextResponse.json({ error: "We couldn't create the PDF just now. Please try again." }, { status: 500 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="VocalisAi-certificate-${cert.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
